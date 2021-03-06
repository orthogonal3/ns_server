var mn = mn || {};
mn.helper = mn.helper || {};
mn.helper.extends = (function () {

  var extendStatics = Object.setPrototypeOf ||
      ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
      function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };

  function __extends(d, b) {
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  }

  return __extends;
})();

var mn = mn || {};
mn.helper = mn.helper || {};
mn.helper.validateEqual = (function () {
  return function (key1, key2, erroName) {
    return function (group) {
      if (group.get(key1).value !== group.get(key2).value) {
        var rv = {};
        rv[erroName] = true;
        return rv;
      }
    }
  }
})();

var mn = mn || {};
mn.helper = mn.helper || {};
mn.helper.httpErrorScenario = (function () {
  return function (obs) {
    return obs
      .switchMap(function (rv) {
        if (rv instanceof ng.common.http.HttpErrorResponse) {
          return Rx.Observable.of(rv);
        } else if (mn.helper.isJson(rv)) {
          return Rx.Observable.of(new ng.common.http.HttpErrorResponse({error: rv}));
        } else {
          return Rx.Observable.never();
        }
      })
      .pluck("error")
      .map(JSON.parse)
      .share();
  }
})();

var mn = mn || {};
mn.helper = mn.helper || {};
mn.helper.httpSuccessScenario = (function () {
  return function (obs) {
    return obs
      .filter(function (rv) {
        return !(rv instanceof ng.common.http.HttpErrorResponse);
      })
      .share();
  }
})();

var mn = mn || {};
mn.helper = mn.helper || {};
mn.helper.calculateMaxMemorySize = (function () {
  return function (totalRAMMegs) {
    return Math.floor(Math.max(totalRAMMegs * 0.8, totalRAMMegs - 1024));
  }
})();

var mn = mn || {};
mn.helper = mn.helper || {};
mn.helper.invert = (function () {
  return function (v) {
    return !v;
  }
})();

var mn = mn || {};
mn.helper = mn.helper || {};
mn.helper.errorToStream = (function () {
  return function (err) {
    return Rx.Observable.of(err);
  }
})();

var mn = mn || {};
mn.helper = mn.helper || {};
mn.helper.isJson = (function () {
  return function (str) {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  }
})();

mn.helper.MnPostGroupHttp = (function () {

  MnPostGroupHttp.prototype.post = post;
  MnPostGroupHttp.prototype.addSuccess = addSuccess;
  MnPostGroupHttp.prototype.addLoading = addLoading;
  MnPostGroupHttp.prototype.clearErrors = clearErrors;
  MnPostGroupHttp.prototype.getHttpGroupStreams = getHttpGroupStreams;

  return MnPostGroupHttp;

  function MnPostGroupHttp(httpMap) {
    this.request = new Rx.Subject();
    this.httpMap = httpMap;
  }

  function clearErrors() {
    _.forEach(this.httpMap, function (value, key) {
      value.clearError();
    });
  }

  function addSuccess() {
    this.success =
      Rx.Observable
      .zip
      .apply(null, this.getHttpGroupStreams("response"))
      .filter(function (responses) {
        return !_.find(responses, function (resp) {
          return resp instanceof ng.common.http.HttpErrorResponse;
        });
      });
    return this;
  }

  function post(data) {
    this.request.next();
    _.forEach(this.httpMap, function (value, key) {
      value.post(data[key]);
    });
  }

  function getHttpGroupStreams(stream) {
    return _.reduce(this.httpMap, function (result, value, key) {
      result.push(value[stream]);
      return result;
    }, []);
  }

  function addLoading() {
    this.loading =
      Rx.Observable
      .zip
      .apply(null, this.getHttpGroupStreams("response"))
      .mapTo(false)
      .merge(this.request.mapTo(true));
    return this;
  }

})();

mn.helper.MnPostHttp = (function () {

  MnPostHttp.prototype.addResponse = addResponse;
  MnPostHttp.prototype.addSuccess = addSuccess;
  MnPostHttp.prototype.addLoading = addLoading;
  MnPostHttp.prototype.addError = addError;
  MnPostHttp.prototype.post = post;
  MnPostHttp.prototype.clearError = clearError;

  return MnPostHttp;

  function MnPostHttp(call) {
    this._dataSubject = new Rx.Subject();
    this._errorSubject = new Rx.Subject();
    this._loadingSubject = new Rx.Subject();
    this.addResponse(call);
  }

  function clearError() {
    this._errorSubject.next(null);
  }

  function addResponse(call) {
    this.response = this._dataSubject.switchMap(function (data) {
      return call(data).catch(mn.helper.errorToStream);
    }).shareReplay(1);
    return this;
  }

  function addError(modify) {
    var error =
        this.response
        .let(mn.helper.httpErrorScenario)
        .merge(this._errorSubject);
    if (modify) {
      error = error.let(modify);
    }
    this.error = error;
    return this;
  }

  function addLoading() {
    this.loading =
      this._loadingSubject
      .merge(this.response.mapTo(false));

    return this;
  }

  function addSuccess(modify) {
    var success =
        this.response
        .let(mn.helper.httpSuccessScenario);
    if (modify) {
      success = success.let(modify);
    }
    this.success = success;
    return this;
  }

  function post(data) {
    this._loadingSubject.next(true);
    this._dataSubject.next(data);
  }
})();

var mn = mn || {};
mn.helper = mn.helper || {};
mn.helper.MnEventableComponent = (function () {

  var componentLifecycleHooks = [
    "OnChanges",
    "OnInit",
    "DoCheck",
    "AfterContentInit",
    "AfterContentChecked",
    "AfterViewInit",
    "AfterViewChecked",
    "OnDestroy"
  ];

  componentLifecycleHooks.forEach(function (name) {
    MnDestroyableComponent.prototype["ng" + name] = function (value) {
        this["mn" + name].next(value);
      }
  });

  return MnDestroyableComponent;

  function MnDestroyableComponent() {
    componentLifecycleHooks.forEach(createSubjects.bind(this));
    this.mnOnDestroy.do(null, null, doOnCompleted.bind(this));
  }

  function createSubjects(name) {
    this["mn" + name] = new Rx.Subject();
  }

  function completeSubject(name) {
    this["mn" + name].next();
    this["mn" + name].complete();
  }

  function doOnCompleted() {
    componentLifecycleHooks.forEach(completeSubject.bind(this));
  }

})();

var mn = mn || {};
mn.helper = mn.helper || {};
mn.helper.jQueryLikeParamSerializer = (function () {

  jQueryParam.prototype.serializeValue = serializeValue;
  jQueryParam.prototype.serialize = serialize;
  jQueryParam.prototype.toString = toString;

  return jQueryParam;

  //function is borrowed from the Angular source code because we want to
  //use $httpParamSerializerJQLik but with properly encoded params via
  //encodeURIComponent since it uses correct application/x-www-form-urlencoded
  //encoding algorithm, in accordance with
  //https://www.w3.org/TR/html5/forms.html#url-encoded-form-data.
  //And HttpParams doesn't accept array e.g my_key=value1&my_key=value2
  //https://github.com/angular/angular/issues/19071
  function jQueryParam(params) {
    if (!params) {
      return this;
    }
    this.parts = [];
    this.serialize(params, '', true);
  }

  function toString() {
    return this.parts.join("&");
  }

  function serialize(toSerialize, prefix, topLevel) {
    if (_.isArray(toSerialize)) {
      _.forEach(toSerialize, (function (value, index) {
        this.serialize(value, prefix + (_.isObject(value) ? '[' + index + ']' : ''));
      }).bind(this));
    } else if (_.isObject(toSerialize) && !_.isDate(toSerialize)) {
      _.forEach(toSerialize, (function (value, key) {
        this.serialize(value, prefix +
                       (topLevel ? '' : '[') +
                       key +
                       (topLevel ? '' : ']'));
      }).bind(this));
    } else {
      this.parts.push(encodeURIComponent(prefix) + '=' + encodeURIComponent(this.serializeValue(toSerialize)));
    }
  }

  function serializeValue(v) {
    if (_.isObject(v)) {
      return _.isDate(v) ? v.toISOString() : JSON.stringify(v);
    }
    if (v === null || _.isUndefined(v)) {
      return "";
    }
    return v;
  }

})();


var mn = mn || {};
mn.helper = mn.helper || {};
mn.helper.MnHttpEncoder = (function (_super) {
  "use strict";

  mn.helper.extends(MnHttpEncoder ,_super);

  MnHttpEncoder.prototype.encodeKey = encodeKey;
  MnHttpEncoder.prototype.encodeValue = encodeValue;
  MnHttpEncoder.prototype.serializeValue = serializeValue;

  return MnHttpEncoder;

  function MnHttpEncoder() {
    var _this = _super.call(this) || this;
    return _this;
  }

  function encodeKey(k) {
    return encodeURIComponent(k);
  }

  function encodeValue(v) {
    return encodeURIComponent(this.serializeValue(v));
  }

  function serializeValue(v) {
    if (_.isObject(v)) {
      return _.isDate(v) ? v.toISOString() : JSON.stringify(v);
    }
    if (v === null || _.isUndefined(v)) {
      return "";
    }
    return v;
  }
})(ng.common.http.HttpUrlEncodingCodec);

mn.helper.IEC = {
  Ki: 1024,
  Mi: 1048576,
  Gi: 1073741824
};
