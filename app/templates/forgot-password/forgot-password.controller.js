(function () {
    'use strict';

    angular
        .module('app')
        .controller('ForgotPasswordController', ForgotPasswordController);

    ForgotPasswordController.$inject = ['$location', 'AuthenticationService', 'FlashService'];
    function ForgotPasswordController($location, AuthenticationService, FlashService) {
      var vm = this;

      vm.forgotPasswordStep1 = true;
      vm.forgotPasswordStep2 = false;
      vm.forgotPasswordStep3 = false;
      vm.forgotPasswordForward = function () {
        if (vm.forgotPasswordStep1) {
          vm.forgotPasswordStep1 = false;
          vm.forgotPasswordStep2 = true;
        } else if (vm.forgotPasswordStep2) {
          vm.forgotPasswordStep2 = false;
          vm.forgotPasswordStep3 = true;
        }
      };
  }

})();
