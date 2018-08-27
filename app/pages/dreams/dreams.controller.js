(function () {
    'use strict';

    angular
        .module('app')
        .controller('DreamsController', DreamsController);

    DreamsController.$inject = ['UserService', '$rootScope', '$location'];
    function DreamsController(UserService, $rootScope, $location) {
        var vm = this;

        vm.isActive = function (viewLocation) {
          return viewLocation === $location.path();
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

        vm.formats = ['dd-MMMM-yyyy', 'yyyy/MM/dd', 'dd.MM.yyyy', 'shortDate'];
        vm.format = vm.formats[0];
        vm.altInputFormats = ['M!/d!/yyyy'];

        var tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        var afterTomorrow = new Date();
        afterTomorrow.setDate(tomorrow.getDate() + 1);
        vm.events = [
          {
            date: tomorrow,
            status: 'full'
            },
          {
            date: afterTomorrow,
            status: 'partially'
            }
          ];

        function getDayClass(date, mode) {
          if (mode === 'day') {
            var dayToCheck = new Date(date).setHours(0, 0, 0, 0);

            for (var i = 0; i < $scope.events.length; i++) {
              var currentDay = new Date($scope.events[i].date).setHours(0, 0, 0, 0);

              if (dayToCheck === currentDay) {
                return $scope.events[i].status;
              }
            }
          }

          return '';
        };
        // end datepicker stuff
    }

})();
