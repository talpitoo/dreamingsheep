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
          {"name":"drugs","icon":"cannabis"},
          {"name":"spacetime","icon":"wormhole"},
          {"name":"sci-fi","icon":"enterprise"},
          {"name":"spirit","icon":"jaguar"},
          {"name":"paranormal","icon":"eye-of-horus"},
          {"name":"abstract","icon":"optical-illusion"},
          {"name":"death","icon":"grim-reaper"},
          {"name":"religious","icon":"jesus"},
          {"name":"falling","icon":"falling"},
          {"name":"flying","icon":"superhero"},
          {"name":"conflict","icon":"fight"},
          {"name":"music","icon":"music"},
          {"name":"zombies","icon":"zombie"},
          {"name":"trickster","icon":"joker"},
          {"name":"crystals","icon":"crystals"},
          {"name":"technology","icon":"device"},
          {"name":"replicants/AI","icon":"c-3po"},
          {"name":"home/familiar","icon":"home"},
          {"name":"work/school","icon":"work"},
          {"name":"city/urban","icon":"city"},
          {"name":"vehicle","icon":"vehicle"},
          {"name":"nature/outdoors","icon":"trees"},
          {"name":"(under)water","icon":"water"},
          {"name":"unicorn","icon":"unicorn"},
          {"name":"rainbow/hologram","icon":"rainbow"},
          {"name":"fire","icon":"fire"},
          {"name":"snow/ice","icon":"snow"},
          {"name":"wind","icon":"wind"},
          {"name":"rain","icon":"rain"},
          {"name":"dracula","icon":"dracula"},
          {"name":"fairy","icon":"fairy"},
          {"name":"mermaid","icon":"mermaid"},
          {"name":"new age","icon":"dolphin"},
          {"name":"dragon","icon":"dragon"},
          {"name":"self-transforming machine-elves","icon":"geometry"},
          {"name":"sunny/clear","icon":"sun"},
          {"name":"mythical","icon":"centaur"},
          {"name":"sport","icon":"sport"},
          {"name":"insects","icon":"spider"},
          {"name":"animals/creatures","icon":"dinosaur"},
          {"name":"family (member)","icon":"family"},
          {"name":"significant other","icon":"significant-other"},
          {"name":"friend/colleague","icon":"friends"},
          {"name":"stranger","icon":"detective-agent"},
          {"name":"fractal","icon":"mandelbrot"},
          {"name":"aliens","icon":"alien"},
          {"name":"telepathy","icon":"split-leaf-philodendron"},
          {"name":"deceased","icon":"grave"},
          {"name":"mysterious","icon":"mask"},
          {"name":"romance","icon":"kiss"},
          {"name":"sex","icon":"sex"},
          {"name":"pet","icon":"pet"},
          {"name":"love","icon":"care"},
          {"name":"transcendental","icon":"shine-2"},
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
              icon: 'tag',
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
