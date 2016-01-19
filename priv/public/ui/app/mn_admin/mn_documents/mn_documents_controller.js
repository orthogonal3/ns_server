(function () {
  "use strict";

  angular
    .module("mnDocuments", [
      "mnDocumentsListService",
      "mnDocumentsEditingService",
      "mnPromiseHelper",
      "mnFilter",
      "mnFilters",
      "ui.router",
      "ui.bootstrap",
      "ui.codemirror",
      "mnSpinner",
      "ngMessages",
      "mnPoll"
    ])
    .controller("mnDocumentsController", mnDocumentsController);

  function mnDocumentsController($scope, mnPoolDefault, mnDocumentsListService, mnPoller, $state) {
    var vm = this;

    vm.mnPoolDefault = mnPoolDefault.latestValue();
    vm.onSelectBucketName = onSelectBucketName;

    if (vm.mnPoolDefault.value.isROAdminCreds) {
      return;
    }

    activate();

    function onSelectBucketName(selectedBucket) {
      $state.go('app.admin.documents.control.list', {
        documentsBucket: selectedBucket,
        pageNumber: 0
      });
    }

    function activate() {
      new mnPoller($scope, function () {
          return mnDocumentsListService.populateBucketsSelectBox($state.params);
        })
        .subscribe("state", vm)
        .cycle();
    }
  }
})();