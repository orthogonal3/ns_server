-module(load_gen_mc).

-include_lib("eunit/include/eunit.hrl").

-include("mc_constants.hrl").

-include("mc_entry.hrl").

-import(mc_binary, [send/2, send/4, send_recv/5, recv/2]).

-compile(export_all).

main() ->
    {ok, FeederPid} = start_feeder("127.0.0.1", 11211, 1),
    {ok, ResultPid} = start_results(),
    load_gen:start(load_gen_mc, FeederPid, ResultPid).

% --------------------------------------------------------

start_feeder(McHost, McPort, NConns) ->
    start_feeder(McHost, McPort, NConns, self()).

start_feeder(McHost, McPort, NConns, LoadGenPid) ->
    FeederPid = spawn(fun () ->
                          LoadGenPid ! {request, {connect, McHost, McPort, NConns}},
                          LoadGenPid ! {request, {work, all, unused}},
                          LoadGenPid ! input_complete
                      end),
    {ok, FeederPid}.

% --------------------------------------------------------

start_results() -> {ok, spawn(fun results_loop/0)}.

results_loop() ->
    receive
        {result, _Outstanding, _FromNode, _Req, Response} ->
            ?debugVal(Response),
            results_loop();
        {result_progress, _Outstanding, _FromNode, _Req, Progress} ->
            ?debugVal(Progress),
            results_loop();
        done -> ok
    end.

% --------------------------------------------------------

init() -> request_loop([], []).

request_loop(Socks, Workers) ->
    receive
        {request, From, {connect, McHost, McPort, NConns} = Req} ->
            MoreSocks =
                lists:map(
                  fun (_X) ->
                      case gen_tcp:connect(McHost, McPort,
                                           [binary, {packet, 0},
                                            {active, false}]) of
                          {ok, Sock} -> Sock;
                          Error      -> From ! {response, self(), Req, Error}
                      end
                  end,
                  lists:seq(1, NConns)),
            request_loop(MoreSocks ++ Socks, Workers);

        {request, From, {work, all, Args} = Req} ->
            MoreWorkers = spawn_workers(From, Req, Socks, Args),
            request_loop([], MoreWorkers ++ Workers);

        {request, From, {work, N, Args} = Req} ->
            {WorkerSocks, RemainingSocks} =
                lists:split(erlang:min(N, length(Socks)), Socks),
            MoreWorkers = spawn_workers(From, Req, WorkerSocks, Args),
            request_loop(RemainingSocks, MoreWorkers ++ Workers);

        {request, _From, stop} ->
            stop_workers(Workers),
            request_loop(Socks, []);

        done -> stop_workers(Workers),
                ok
    end.

stop_workers([])              -> ok;
stop_workers([Worker | Rest]) -> Worker ! stop,
                                 stop_workers(Rest).

spawn_workers(From, Req, Socks, Args) ->
    lists:map(fun (Sock) ->
                  spawn(fun () ->
                            loop(From, Req, Sock, 1, Args)
                        end)
              end,
              Socks).

loop(From, Req, Sock, N, Args) ->
    case N rem 1000 of
        0 -> From ! {response_progress, self(), Req, N};
        _ -> ok
    end,
    receive
        stop -> ok
    after 0 ->
        {ok, _H, _E} = mc_client_binary:cmd(?NOOP, Sock, undefined, blank_he()),
        loop(From, Req, Sock, N + 1, Args)
    end.

blank_he() ->
    {#mc_header{}, #mc_entry{}}.

