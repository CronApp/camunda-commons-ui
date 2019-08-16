'use strict';

var angular = require('camunda-bpm-sdk-js/vendor/angular');

require('angular-route');
require('angular-resource');
require('angular-translate');

var commonsUtil = require('../util/index'),
    loginPage = require('./page/login'),
    ifLoggedInDirective = require('./directives/camIfLoggedIn'),
    ifLoggedOutDirective = require('./directives/camIfLoggedOut'),
    authenticationService = require('./service/authenticationService');

  /**
   * @module cam.commons.auth
   */

  /**
   * @memberof cam.commons
   */

var ngModule = angular.module('cam.commons.auth', [
  angular.module('ngRoute').name,
  commonsUtil.name,
  'pascalprecht.translate'
]);

ngModule
  .config(loginPage)

  // redirect after login support
  .run([ '$rootScope', '$location', function($rootScope, $location) {

    var preLoginUrl;

    $rootScope.$on('authentication.login.required', function(event) {

      $rootScope.$evalAsync(function() {

        var url = $location.url();

        // skip if login is already in progress
        // or default got prevented
        if (url === '/login' || event.defaultPrevented) {
          return;
        }

        preLoginUrl = url;
        $location.url('/login');
      });
    });

    $rootScope.$on('authentication.login.success', function(event) {

      $rootScope.$evalAsync(function() {
        // skip if default got prevented
        if (!event.defaultPrevented) {
          $location.url(preLoginUrl || '/').replace();
          preLoginUrl = null;
        }
      });
    });
  }])

  // post logout redirect + reload support
  .run([
    '$cacheFactory', '$rootScope', '$location', '$timeout', 'Notifications', '$translate',
    function($cacheFactory, $rootScope, $location, $timeout, Notifications, $translate) {
      $rootScope.$on('authentication.logout.success', function(event) {
        $rootScope.$evalAsync(function() {
          // skip if default got prevented
          if (!event.defaultPrevented) {
            // clear http cache
            $cacheFactory.get('$http').removeAll();
            window.location.href = window.location.origin + '/#/home';
          }
        });

        // logout is successful - wait for authentication required messages from redirection to dashboard
        // then make an exclusive alert saying that the logout was successful.
        $timeout(function() {

          var getDayContext = function() {
            var now = new Date();
            if(now.getDay() >= 5) {
              return 'AUTH_DAY_CONTEXT_WEEKEND';
            } else {
              var hour = now.getHours();
              switch(true) {
              case (hour >= 4 && hour < 7): return 'AUTH_DAY_CONTEXT_MORNING';
              case (hour >= 7 && hour < 12): return 'AUTH_DAY_CONTEXT_DAY';
              case (hour >= 12 && hour < 17): return 'AUTH_DAY_CONTEXT_AFTERNOON';
              case (hour >= 17 && hour < 22): return 'AUTH_DAY_CONTEXT_EVENING';
              case (hour >= 22 || hour < 4): return 'AUTH_DAY_CONTEXT_NIGHT';
              }
            }
            // should never get here, but just to be sure
            return 'AUTH_DAY_CONTEXT_DAY';
          };

          Notifications.addMessage({
            status: $translate.instant('AUTH_LOGOUT_SUCCESSFUL'),
            message: $translate.instant('AUTH_LOGOUT_THANKS', { dayContext: $translate.instant(getDayContext()) }),
            exclusive: true
          });
        });
      });
    }
  ])

  // notification integration
  .run([
    '$rootScope', 'Notifications', '$translate', 'shouldDisplayAuthenticationError',
    function($rootScope, Notifications, $translate, shouldDisplayAuthenticationError) {
      $rootScope.$on('authentication.login.required', function() {
        if (shouldDisplayAuthenticationError()) {
          Notifications.addError({
            status: $translate.instant('AUTH_FAILED_TO_DISPLAY_RESOURCE'),
            message: $translate.instant('AUTH_AUTHENTICATION_FAILED'),
            http: true,
            exclusive: ['http']
          });
        }
      });
    }
  ])

  // ensure AuthenticationService is bootstraped
  .run(['AuthenticationService', function() { } ])

  .directive('camIfLoggedIn', ifLoggedInDirective)
  .directive('camIfLoggedOut', ifLoggedOutDirective)

  .service('AuthenticationService', authenticationService);

module.exports = ngModule;
