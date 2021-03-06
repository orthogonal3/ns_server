/**
 * Reactive extensions for UI-Router
 * @version v0.4.1
 * @link https://github.com/ui-router/rx#readme
 * @license MIT License, http://www.opensource.org/licenses/MIT
 */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('rxjs/add/operator/mergeMap'), require('rxjs/add/operator/map'), require('rxjs/ReplaySubject')) :
	typeof define === 'function' && define.amd ? define(['exports', 'rxjs/add/operator/mergeMap', 'rxjs/add/operator/map', 'rxjs/ReplaySubject'], factory) :
	(factory((global['@uirouter/rx'] = global['@uirouter/rx'] || {}),null,null,global.Rx));
}(this, (function (exports,rxjs_add_operator_mergeMap,rxjs_add_operator_map,rxjs_ReplaySubject) { 'use strict';

/** @module rx */
/** */
/** Augments UIRouterGlobals with observables for transition starts, successful transitions, and state parameters */
var UIRouterRx = (function () {
    function UIRouterRx(router) {
        this.name = '@uirouter/rx';
        this.deregisterFns = [];
        var start$ = new rxjs_ReplaySubject.ReplaySubject(1);
        var success$ = start$.mergeMap(function (t) { return t.promise.then(function () { return t; }); });
        var params$ = success$.map(function (transition) { return transition.params(); });
        var states$ = new rxjs_ReplaySubject.ReplaySubject(1);
        function onStatesChangedEvent(event, states) {
            var changeEvent = {
                currentStates: router.stateRegistry.get(),
                registered: [],
                deregistered: []
            };
            if (event)
                changeEvent[event] = states;
            states$.next(changeEvent);
        }
        this.deregisterFns.push(router.transitionService.onStart({}, function (transition) { return start$.next(transition); }));
        this.deregisterFns.push(router.stateRegistry.onStatesChanged(onStatesChangedEvent));
        onStatesChangedEvent(null, null);
        Object.assign(router.globals, { start$: start$, success$: success$, params$: params$, states$: states$ });
    }
    UIRouterRx.prototype.dispose = function () {
        this.deregisterFns.forEach(function (deregisterFn) { return deregisterFn(); });
        this.deregisterFns = [];
    };
    return UIRouterRx;
}());
var UIRouterRxPlugin = UIRouterRx;

exports.UIRouterRx = UIRouterRx;
exports.UIRouterRxPlugin = UIRouterRxPlugin;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=ui-router-rx.js.map
