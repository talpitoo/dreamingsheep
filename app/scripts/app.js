(function () {
    'use strict';

    angular
        .module('app', ['ngRoute', 'ngCookies', 'ui.bootstrap', 'ui.select', 'googlechart'])
        .config(config)
        .run(run);

    config.$inject = ['$routeProvider', '$locationProvider'];
    function config($routeProvider, $locationProvider) {
        $routeProvider
            .when('/', { redirectTo: '/dreams' })

            .when('/dreams', {
                controller: 'DreamsController',
                templateUrl: 'templates/dreams/dreams.view.html',
                controllerAs: 'vm'
            })

            .when('/symbols', {
                controller: 'SymbolsController',
                templateUrl: 'templates/symbols/symbols.view.html',
                controllerAs: 'vm'
            })

            .when('/stats', {
                controller: 'StatsController',
                templateUrl: 'templates/stats/stats.view.html',
                controllerAs: 'vm'
            })

            .when('/search', {
                controller: 'SearchController',
                templateUrl: 'templates/search/search.view.html',
                controllerAs: 'vm'
            })

            .when('/settings', {
                controller: 'SettingsController',
                templateUrl: 'templates/settings/settings.view.html',
                controllerAs: 'vm'
            })

            .when('/faq', {
                controller: 'FaqController',
                templateUrl: 'templates/faq/faq.view.html',
                controllerAs: 'vm'
            })

            .when('/blog', {
                controller: 'BlogController',
                templateUrl: 'templates/blog/blog.view.html',
                controllerAs: 'vm'
            })

            .when('/login', {
                controller: 'LoginController',
                templateUrl: 'templates/login/login.view.html',
                controllerAs: 'vm'
            })

            .when('/signup', {
                controller: 'SignupController',
                templateUrl: 'templates/signup/signup.view.html',
                controllerAs: 'vm'
            })

            .when('/forgot-password', {
                controller: 'ForgotPasswordController',
                templateUrl: 'templates/forgot-password/forgot-password.view.html',
                controllerAs: 'vm'
            })

            .otherwise({ redirectTo: '/login' });

            // $locationProvider.html5Mode(true);
            // $locationProvider.hashPrefix('');
    }

    run.$inject = ['$rootScope', '$location', '$cookieStore', '$http'];
    function run($rootScope, $location, $cookieStore, $http) {
        // keep user logged in after page refresh
        $rootScope.globals = $cookieStore.get('globals') || {};
        if ($rootScope.globals.currentUser) {
            $http.defaults.headers.common['Authorization'] = 'Basic ' + $rootScope.globals.currentUser.authdata; // jshint ignore:line
        }

        $rootScope.$on('$locationChangeStart', function (event, next, current) {
            // redirect to login page if not logged in and trying to access a restricted page
            var restrictedPage = $.inArray($location.path(), ['/login', '/signup', '/faq', '/blog', '/forgot-password']) === -1;
            var loggedIn = $rootScope.globals.currentUser;
            if (restrictedPage && !loggedIn) {
                $location.path('/login');
            }
        });
    }

})();
