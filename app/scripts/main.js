'use strict';

// angular
angular.module('dreamingsheepApp', ['ui.bootstrap', 'ui.select']); //'ngSanitize',
angular.module('dreamingsheepApp').controller('DreamCtrl', function ($scope, $uibModal) {
// angular.module('dreamingsheepApp').controller('DreamCtrl', function ($scope) {
  // symbols
  $scope.availableSymbols = ['levitation', 'cycling', 'mountains', 'flying', 'dog', 'joy', 'apple', 'snake'];
  $scope.multipleSymbols = {};
  $scope.multipleSymbols.symbols = ['cycling', 'mountains'];

  //related dreams
  $scope.availableDreams = ['Related dream #7', 'dream #2', 'dream #3'];
  $scope.multipleDreams = {};
  $scope.multipleDreams.dreams = ['Related dream #7'];


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
      templateUrl: 'modalDelete.html',
      controller: 'ModalInstanceCtrl',
      size: size,
      resolve: {
        items: function () {
          return $scope.items;
        }
      }
    });

  };

  // floating menu
  $scope.menu = {
    isopen: false
  };

  $scope.toggleDropdown = function ($event) {
    $event.preventDefault();
    $event.stopPropagation();
    $scope.menu.isopen = !$scope.menu.isopen;
  };

  $scope.appendToEl = angular.element(document.querySelector('#dropdown-long-content'));

  // collapsed dream details
  $scope.isCollapsed = false;

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

/* helpers */
var dreamToDelete;

$(function () {

  /* reset password */
  $('.step2').hide();
  $('.step3').hide();
  $('.step1 .btn').on('click', function () {
    $('.step1').hide();
    $('.step2').show();
  });
  $('.step2 .btn').on('click', function () {
    $('.step1').hide();
    $('.step2').hide();
    $('.step3').show();
  });


  //add dream
  $('.dream.empty').hide();
  $('.js-edit').hide();
  $('.action-add').on('click', function () {
    //hide and disable previous dream
    $('.dream:first').addClass('inactive');
    $('.dream:first .form-control').removeClass('col-sm-10').addClass('col-sm-12').attr('disabled', true);
    $('.dream:first .form-control').parent().removeClass('col-sm-10').addClass('col-sm-12');
    $('.js-edit', '.dream:first').show();
    //close the dummy mockup
    $('.empty').clone(true).insertAfter('.dream:last').removeClass('empty').fadeIn(function () {});
  });

  //add symbol
  $('.symbol.empty').hide();
  $('.js-add-symbol').on('click', function () {
    $('.symbol.empty').show();
  });

  //delete dream
  $('.js-delete').on('click', function () {
    dreamToDelete = $(this).parents('.dream');
    if (dreamToDelete.find('input[type="text"]:nth-child(1)').val() === '') {
      $('.js-dream-to-delete').html('this dream');
    } else {
      $('.js-dream-to-delete').html(dreamToDelete.find('input[type="text"]:nth-child(1)').val());
    }
  });
  $('#confirmation .btn-primary').on('click', function () {
    dreamToDelete.fadeOut(400, function () {
      dreamToDelete.remove();
    });
  });

  //update dream summary icons
  $('.js-mood .btn').on('click', function () {
    var selectedMood = $(this).find('input').val();
    $(this).closest('.dream').find('.js-summary-mood').removeClass().addClass('js-summary-mood lucidicon lucidicon-' + selectedMood);
  });
  $('.js-recall .btn').on('click', function () {
    var selectedRecall = $(this).find('input').val();
    switch (selectedRecall) {
    case 'blurry':
      selectedRecall = 'batteryempty';
      break;
    case 'na':
      selectedRecall = 'batteryhalf';
      break;
    case 'clear':
      selectedRecall = 'batteryfull';
      break;
    }
    $(this).closest('.dream').find('.js-summary-recall').removeClass().addClass('js-summary-recall lucidicon lucidicon-' + selectedRecall);
  });
  $('.js-type .btn').on('click', function () {
    var selectedType = $(this).find('input').val();
    switch (selectedType) {
    case 'regular':
      selectedType = '';
      break;
    case 'lucid':
      selectedType = 'lightning';
      break;
    case 'obe':
      selectedType = 'users';
      break;
    case 'precognition':
      selectedType = 'camera';
      break;
    case 'falseawakening':
      selectedType = 'alarm';
      break;
    }
    $(this).closest('.dream').find('.js-summary-type').removeClass().addClass('js-summary-type lucidicon lucidicon-' + selectedType);
  });

  //dummy save to database
  $('.loader').hide();
  $('.form-control').on('blur', function () {
    $('.loader').show(0, function () {
      $(this).fadeOut(2000);
    });
    //localStorage.setItem('contenteditable', this.innerHTML);
    //
    //http://www.json.org/js.html
    //var testObject = { 'one': 1, 'two': 2, 'three': 3 };
    //// Put the object into storage
    //localStorage.setItem('testObject', JSON.stringify(testObject));
    //// Retrieve the object from storage
    //var retrievedObject = localStorage.getItem('testObject');
    //console.log('retrievedObject: ', JSON.parse(retrievedObject));
  });

  //autocomplete
  //    var addTagCallback = function (tagText, selector) {
  //        $('.js-autocomplete-symbols').append($('<option></option>').val(tagText).html(tagText));
  //        $("option:last", selector.form_field).attr('selected', 'selected');
  //        $('.js-autocomplete-symbols').trigger("liszt:updated");
  //    };
  //    $(".dream:first .js-autocomplete-dreams").chosen();
  //    $(".dream:first .js-autocomplete-symbols").chosen({ addNewElementCallback: addTagCallback, no_results_text: "Create new symbol" });



  /* advanced search */
  //    $('.dates input[type="text"]').datepicker({
  //        prevText: "&laquo;",
  //        nextText: "&raquo;"
  //    });
  //    $(".js-search .js-autocomplete-symbols").chosen();
  //    $(".js-search-results").hide();
  //    $(".js-advanced-search").on('click', function () {
  //        $(".js-search-results").show();
  //    });



  /* symbol editor */
  $('.js-symbol-editor .details').hide();
  $('table a').on('click', function () {
    $('.js-symbol-editor .overview').hide();
    $('.js-symbol-editor .details').show();
  });

});
