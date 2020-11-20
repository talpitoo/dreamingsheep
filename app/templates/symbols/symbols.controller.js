(function () {
    'use strict';

    angular
        .module('app')
        .controller('SymbolsController', SymbolsController)
        // Please note that $modalInstance represents a modal window (instance) dependency.
        // It is not the same as the $uibModal service used above.
        .controller('ModalInstanceCtrl', function ($scope, $uibModalInstance) {
          $scope.ok = function () {
            $uibModalInstance.close();
          };
          $scope.cancel = function () {
            $uibModalInstance.dismiss('cancel');
          };
        });

    SymbolsController.$inject = ['$location', 'AuthenticationService', 'FlashService', '$uibModal'];
    function SymbolsController($location, AuthenticationService, FlashService, $uibModal) {
        var vm = this;

        vm.isActive = function (viewLocation) {
          return viewLocation === $location.path();
        };

        // search
        vm.searchInput = "";
        vm.submitSearch = function(searchObject) {
          $location.path("/search");
        };

        // modal
        vm.open = function (size) {
          $uibModal.open({
            templateUrl: '../../templates/modal-delete-symbol.tmpl.html',
            controller: 'ModalInstanceCtrl',
            size: size,
            resolve: {
              items: function () {
                // return vm.items;
              }
            }
          });
        };

        vm.jsonSymbols = [
          {
              'name': 'Flying',
              'occurence': '17',
              'picture': '',
              'dreams': ['Dream #1', 'Dream #2', 'Dream #3'],
              'sleep': 'starry-night',
              'mood': 'laugh',
              'recall': 'batteryfull',
              'type': 'eye',
              'isExpanded': false
          },
          {
              'name': 'Floating island',
              'occurence': '12',
              'picture': 'http://img01.deviantart.net/e1ed/i/2010/241/5/c/the_floating_island_by_araiko_o-d2xki7p.jpg',
              'dreams': ['Dream #1', 'Dream #2', 'Dream #3', 'Dream #4', 'Dream #5', 'Dream #6'],
              'sleep': 'sunset',
              'mood': 'smiley',
              'recall': 'batteryhalf',
              'type': 'zzz',
              'isExpanded': true
          },
          {
              'name': 'Rainbow',
              'occurence': '9',
              'picture': '',
              'dreams': ['Dream #1', 'Dream #2'],
              'sleep': 'starry-night',
              'mood': 'laugh',
              'recall': 'batteryhalf',
              'type': 'zzz',
              'isExpanded': false
          },
          {
              'name': 'Dog',
              'occurence': '8',
              'picture': '',
              'dreams': ['Dream #1', 'Dream #2'],
              'sleep': 'starry-night',
              'mood': 'laugh',
              'recall': 'batteryhalf',
              'type': 'zzz',
              'isExpanded': false
          },
          {
              'name': 'Friend',
              'occurence': '4',
              'picture': '',
              'dreams': ['Dream #1', 'Dream #2'],
              'sleep': 'starry-night',
              'mood': 'laugh',
              'recall': 'batteryhalf',
              'type': 'zzz',
              'isExpanded': false
          }
        ];

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
