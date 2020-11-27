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
              'name': 'flying',
              'icon': 'superhero',
              'predefined': true,
              'occurence': '17',
              'dreams': ['Dream #1', 'Dream #2', 'Dream #3', 'Dream #4', 'Dream #5', 'Dream #6', 'Dream #7', 'Dream #8', 'Dream #9', 'Dream #10', 'Dream #11', 'Dream #12', 'Dream #13', 'Dream #14', 'Dream #15', 'Dream #16', 'Dream #17'],
              'sleep': 'starry-night',
              'mood': 'laugh',
              'recall': 'batteryfull',
              'type': 'eye',
              'isExpanded': false
          },
          {
              'name': 'Floating island',
              'icon': 'tag',
              'predefined': false,
              'occurence': '12',
              'picture': 'http://img01.deviantart.net/e1ed/i/2010/241/5/c/the_floating_island_by_araiko_o-d2xki7p.jpg',
              'dreams': ['Dream #1', 'Dream #2', 'Dream #3', 'Dream #4', 'Dream #5', 'Dream #6', 'Once upon a time in Gondoland', 'Big Muzzy', '2001 dream odyssey', 'Dream #10', 'Dream #11', 'Dream #12'],
              'sleep': 'sunset',
              'mood': 'smiley',
              'recall': 'batteryhalf',
              'type': 'zzz',
              'isExpanded': true
          },
          {
              'name': 'My symbol #3',
              'icon': 'tag',
              'predefined': false,
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
              'name': 'rainbow/hologram',
              'icon': 'rainbow',
              'predefined': true,
              'occurence': '7',
              'picture': '',
              'dreams': ['Dream #1', 'Dream #2'],
              'sleep': 'starry-night',
              'mood': 'laugh',
              'recall': 'batteryhalf',
              'type': 'zzz',
              'isExpanded': false
          },
          {
              'name': 'friend',
              'icon': 'friends',
              'predefined': true,
              'occurence': '4',
              'picture': '',
              'dreams': ['Dream #1', 'Dream #2'],
              'sleep': 'starry-night',
              'mood': 'laugh',
              'recall': 'batteryhalf',
              'type': 'zzz',
              'isExpanded': false
          },
          {
              'name': 'My symbol #1',
              'icon': 'tag',
              'predefined': false,
              'occurence': '1',
              'picture': '',
              'dreams': ['Dream #1', 'Dream #2'],
              'sleep': 'starry-night',
              'mood': 'laugh',
              'recall': 'batteryhalf',
              'type': 'zzz',
              'isExpanded': false
          },
          {
              'name': 'My symbol #2',
              'icon': 'tag',
              'predefined': false,
              'occurence': '1',
              'picture': '',
              'dreams': ['Dream #1', 'Dream #2'],
              'sleep': 'starry-night',
              'mood': 'laugh',
              'recall': 'batteryhalf',
              'type': 'zzz',
              'isExpanded': false
          },
        ];

        (function initController() {
            
        })();
    }

})();
