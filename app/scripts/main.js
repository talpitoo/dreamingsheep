console.log('\'Allo \'Allo!');

// angular
angular.module('dreamingsheepApp', ['ui.bootstrap', 'ui.select']).controller('DreamCtrl', function ($scope, $uibModal, $timeout) {
   'use strict';

  // navbar collapse
  $scope.isNavCollapsed = true;
  $scope.isCollapsed = false;
  $scope.isSymbolCollapsed = true;
  $scope.isCollapsedHorizontal = false;
  $scope.isAdvancedSearchCollapsed = false;
  $scope.isSaving = false; // dummy loader icon

  // symbols
  $scope.availableSymbols = ['levitation', 'cycling', 'mountains', 'flying', 'dog', 'joy', 'apple', 'snake'];
  $scope.multipleSymbols = {};
  $scope.multipleSymbols.symbols = ['symbol #1', 'symbol #2'];

  // datepicker
  $scope.today = function () {
    $scope.dt = new Date();
  };
  $scope.today();

  $scope.clear = function () {
    $scope.dt = null;
  };

  $scope.toggleMin = function () {
    $scope.minDate = $scope.minDate ? null : new Date();
  };

  $scope.toggleMin();
  $scope.maxDate = new Date(2020, 5, 22);

  $scope.setDate = function (year, month, day) {
    $scope.dt = new Date(year, month, day);
  };

  $scope.dateOptions = {
    formatYear: 'yy',
    startingDay: 1
  };

  $scope.formats = ['dd-MMMM-yyyy', 'yyyy/MM/dd', 'dd.MM.yyyy', 'shortDate'];
  $scope.format = $scope.formats[0];
  $scope.altInputFormats = ['M!/d!/yyyy'];

  var tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  var afterTomorrow = new Date();
  afterTomorrow.setDate(tomorrow.getDate() + 1);
  $scope.events = [
    {
      date: tomorrow,
      status: 'full'
      },
    {
      date: afterTomorrow,
      status: 'partially'
      }
    ];

  $scope.getDayClass = function (date, mode) {
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

  // modal
  $scope.open = function (size) {

    // var modalInstance = $uibModal.open({
    $uibModal.open({
      // templateUrl: 'modalDelete.html',
      templateUrl: 'modal-delete.tmpl.html',
      controller: 'ModalInstanceCtrl',
      size: size,
      resolve: {
        items: function () {
          return $scope.items;
        }
      }
    });

  };

  $scope.save = function () {
    $scope.isSaving = true;
    $timeout(function() {
      $scope.isSaving = false;
    }, 1000);
  };

  $scope.forgotPasswordStep1 = true;
  $scope.forgotPasswordStep2 = false;
  $scope.forgotPasswordStep3 = false;
  $scope.forgotPasswordForward = function () {
    if ($scope.forgotPasswordStep1) {
      $scope.forgotPasswordStep1 = false;
      $scope.forgotPasswordStep2 = true;
    } else if ($scope.forgotPasswordStep2) {
      $scope.forgotPasswordStep2 = false;
      $scope.forgotPasswordStep3 = true;
    }
  };

  $scope.jsonSymbols = [
    {
        'name': 'Flying',
        'occurence': '17',
        'picture': '',
        'dreams': ['Dream #1', 'Dream #2', 'Dream #3'],
        'sleep': 'starry-night',
        'mood': 'smiley',
        'recall': 'batteryfull',
        'type': 'zzz',
        'isExpanded': false
    },
    {
        'name': 'Floating island',
        'occurence': '12',
        'picture': 'http://img01.deviantart.net/e1ed/i/2010/241/5/c/the_floating_island_by_araiko_o-d2xki7p.jpg',
        'dreams': ['Dream #1', 'Dream #2', 'Dream #3', 'Dream #4', 'Dream #5', 'Dream #6'],
        'sleep': 'sunset',
        'mood': 'laugh',
        'recall': 'batteryhalf',
        'type': 'eye',
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

});

// Please note that $modalInstance represents a modal window (instance) dependency.
// It is not the same as the $uibModal service used above.

angular.module('dreamingsheepApp').controller('ModalInstanceCtrl', function ($scope, $uibModalInstance) {

  $scope.ok = function () {
    $uibModalInstance.close();
  };

  $scope.cancel = function () {
    $uibModalInstance.dismiss('cancel');
  };
});
