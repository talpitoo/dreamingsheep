(function () {
    'use strict';

    angular
        .module('app')
        .controller('DreamsController', DreamsController)
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

    DreamsController.$inject = ['UserService', '$rootScope', '$location', '$timeout', '$uibModal'];
    function DreamsController(UserService, $rootScope, $location, $timeout, $uibModal) {
        var vm = this;

        vm.isActive = function (viewLocation) {
          return viewLocation === $location.path();
        };

        vm.isSaving = false;
        vm.save = function () {
          vm.isSaving = true;
          $timeout(function() {
            vm.isSaving = false;
          }, 1000);
        };

        // symbols
        vm.availableSymbols = [
          {"name":"OBE/astral projection","icon":"astral"},
          {"name":"false alarm","icon":"alarm"},
          {"name":"false memory","icon":"brain"},
          {"name":"inception/A ⊆ B","icon":"top"},
          {"name":"recurring","icon":"ouroboros"},
          {"name":"nightmare","icon":"scream"},
          {"name":"intuition/precognition","icon":"poker"},
          {"name":"spacetime","icon":"wormhole"},
        ];
        vm.multipleSymbols = {};
        vm.multipleSymbols.symbols = [
          {"name":"OBE/astral projection","icon":"astral"},
          {"name":"false alarm","icon":"alarm"},
          {"name":"false memory","icon":"brain"},
        ]
        vm.tagTransform = function (newTag) {
          var item = {
              name: newTag,
              icon: 'price-tag',
          };
          return item;
        };

        // search
        vm.searchInput = "";
        vm.submitSearch = function(searchObject) {
          $location.path("/search");
        };

        vm.user = null;
        vm.allUsers = [];
        vm.deleteUser = deleteUser;

        initController();

        function initController() {
            loadCurrentUser();
            loadAllUsers();
        }

        function loadCurrentUser() {
            UserService.GetByUsername($rootScope.globals.currentUser.username)
                .then(function (user) {
                    vm.user = user;
                });
        }

        function loadAllUsers() {
            UserService.GetAll()
                .then(function (users) {
                    vm.allUsers = users;
                });
        }

        function deleteUser(id) {
            UserService.Delete(id)
            .then(function () {
                loadAllUsers();
            });
        }

        // datepicker stuff
        function today() {
          vm.dt = new Date();
        };
        today();

        function clear() {
          vm.dt = null;
        };

        function toggleMin() {
          vm.minDate = vm.minDate ? null : new Date();
        };

        toggleMin();
        vm.maxDate = new Date(2020, 5, 22);

        function setDate(year, month, day) {
          vm.dt = new Date(year, month, day);
        };

        vm.dateOptions = {
          formatYear: 'yy',
          startingDay: 1
        };

        vm.options = {
          customClass: getDayClass,
          showWeeks: false
        };

        vm.formats = ['dd-MMMM-yyyy', 'yyyy/MM/dd', 'dd.MM.yyyy', 'shortDate'];
        vm.format = vm.formats[0];
        vm.altInputFormats = ['M!/d!/yyyy'];

        var yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 4);
        var yesterday2 = new Date();
        yesterday2.setDate(yesterday2.getDate() - 5);
        var yesterday3 = new Date();
        yesterday3.setDate(yesterday3.getDate() - 9);
        var tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 7);
        var afterTomorrow = new Date(tomorrow);
        afterTomorrow.setDate(tomorrow.getDate() + 11);
        vm.events = [
          {
            date: yesterday,
            status: 'has-dreams'
            },
            {
              date: yesterday2,
              status: 'has-dreams'
              },
              {
                date: yesterday3,
                status: 'has-dreams'
                },
              {
                date: tomorrow,
                status: 'has-dreams'
                },
          {
            date: afterTomorrow,
            status: 'has-dreams'
            }
          ];

          function getDayClass(data) {
            var date = data.date,
              mode = data.mode;
            if (mode === 'day') {
              var dayToCheck = new Date(date).setHours(0,0,0,0);

              for (var i = 0; i < vm.events.length; i++) {
                var currentDay = new Date(vm.events[i].date).setHours(0,0,0,0);

                if (dayToCheck === currentDay) {
                  return vm.events[i].status;
                }
              }
            }


          return '';
        };
        // end datepicker stuff

        // modal
        vm.open = function (size) {
          $uibModal.open({
            templateUrl: '../../templates/modal-delete-dream.tmpl.html',
            controller: 'ModalInstanceCtrl',
            size: size,
            resolve: {
              items: function () {
                // return vm.items;
              }
            }
          });
        };
    }

})();
