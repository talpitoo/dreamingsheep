(function () {
    'use strict';

    angular
        .module('app')
        .controller('BlogController', BlogController);

    BlogController.$inject = ['$location', 'AuthenticationService', 'FlashService'];
    function BlogController($location, AuthenticationService, FlashService) {
      var vm = this;
  }

})();
