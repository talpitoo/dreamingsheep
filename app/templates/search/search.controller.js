(function () {
    'use strict';

    angular
        .module('app')
        .controller('SearchController', SearchController);

    SearchController.$inject = ['$location', 'AuthenticationService', 'FlashService'];
    function SearchController($location, AuthenticationService, FlashService) {
        var vm = this;

        vm.isActive = function (viewLocation) {
          return viewLocation === $location.path();
        };

        vm.searchInput = "";
        vm.submitSearch = function(searchObject) {
          $location.path("/search");
        };

        (function initController() {
            //
        })();
    }

})();
