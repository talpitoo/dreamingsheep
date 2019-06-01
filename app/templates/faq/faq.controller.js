(function () {
    'use strict';

    angular
        .module('app')
        .controller('FaqController', FaqController);

    FaqController.$inject = ['$location', 'AuthenticationService', 'FlashService'];
    function FaqController($location, AuthenticationService, FlashService) {
        var vm = this;

        vm.isActive = function (viewLocation) {
          return viewLocation === $location.path();
        };

        // search
        vm.searchInput = "";
        vm.submitSearch = function(searchObject) {
          $location.path("/search");
        };

        (function initController() {
            // reset login status
            // AuthenticationService.ClearCredentials();
        })();

        // function login() {
        //     vm.dataLoading = true;
        //     AuthenticationService.Login(vm.username, vm.password, function (response) {
        //         if (response.success) {
        //             AuthenticationService.SetCredentials(vm.username, vm.password);
        //             $location.path('/');
        //         } else {
        //             FlashService.Error(response.message);
        //             vm.dataLoading = false;
        //         }
        //     });
        // };
    }

})();
