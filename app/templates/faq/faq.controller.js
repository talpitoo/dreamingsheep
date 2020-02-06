(function () {
    'use strict';

    angular
        .module('app')
        .controller('FaqController', FaqController);

    FaqController.$inject = ['$location', 'AuthenticationService', 'FlashService'];
    function FaqController($location, AuthenticationService, FlashService) {
      var vm = this;
  }

})();
