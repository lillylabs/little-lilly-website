angular.module("Authentication", ["firebase", "ui.router", "Backbone"]);

angular.module("Authentication")
  .run(["$rootScope", "$state", "Auth", "URLService", function ($rootScope, $state, Auth, URLService) {

    if (URLService.isApp() && $state.current.abstract) {
      $state.go("app.account");
    }

    Auth.$onAuthStateChanged(function (firebaseUser) {

      $rootScope.currentAuth = firebaseUser;

      Auth.$onAuthStateChanged(function (firebaseUser) {
        if (URLService.isApp()) {
          if (!firebaseUser) {
            URLService.goToHome();
          }
        }
      });
    });

  }]);

angular.module("Authentication")
  .service("AuthService", ["$q", "$firebaseAuth", "Auth", "Profile", "DataMigration", "URLService", function ($q, $firebaseAuth, Auth, Profile, DataMigration, URLService) {

    this.signUp = function (email, password, firstname, lastname) {
      return Auth.$createUserWithEmailAndPassword(email, password)
        .then(function (firebaseUser) {
          console.log("Auth: User " + firebaseUser.uid + " created successfully!");
          var profile = Profile(firebaseUser.uid);
          profile.name = {
            first: firstname ? firstname : "",
            last: lastname ? lastname : ""
          };
          return profile.$save();
        }).catch(function (error) {
          console.error("Error: ", error);
          return $q.reject(error);
        });
    };

    this.signIn = function (email, password) {

      return Auth.$signInWithEmailAndPassword(email, password).catch(function (error) {

        if (error.code === 'auth/user-not-found') {
          console.log("AuthService: Trying Parse");

          var parseUserInfo = {};

          return Parse.User.logIn(email, password).then(function (parseUser) {

            console.log("AuthService: Parse User Found");
            return DataMigration.getParseUserInfo(parseUser);

          }).then(function (info) {
            parseUserInfo = info;
            console.log("AuthService: Parse Info Fetched", parseUserInfo);
            return Auth.$createUserWithEmailAndPassword(email, password);

          }).then(function (firebaseUser) {

            console.log("Auth: User " + firebaseUser.uid + " created successfully!");
            return DataMigration.updateFirebaseUser(firebaseUser, parseUserInfo);

          }).then(function (updatedFirebaseUser) {

            return updatedFirebaseUser;

          }).catch(function (migrationError) {

            console.log("AuthService: Migration Error, ", migrationError);
            return $q.reject(error);

          });

        } else {
          console.log("AuthService: Error, ", error);
          return $q.reject(error);
        }
      });
    };

    this.signOut = function () {
      Auth.$signOut();
      if (URLService.isApp()) {
        URLService.goToSignIn();
      }
    };

  }]);

angular.module("Authentication")
  .controller("SignUpFormController", ["$scope", "AuthService", "URLService", function ($scope, AuthService, URLService) {

    $scope.signUp = function () {
      AuthService.signUp($scope.email, $scope.password, $scope.firstname, $scope.lastname).then(function () {
        URLService.goToApp();
      }).catch(function (error) {
        $scope.error = error.message;
      });
    };

  }]);

angular.module("Authentication")
  .controller("SignInFormController", ["$scope", "AuthService", "URLService", function ($scope, AuthService, URLService) {

    $scope.submitting = false;
    $scope.error = null;

    $scope.signIn = function () {
      $scope.submitting = true;
      $scope.error = null;
      AuthService.signIn($scope.email, $scope.password).then(function () {
        URLService.goToApp();
      }).catch(function (error) {
        $scope.submitting = false;
        $scope.error = error.message;
      });
    };

  }]);

angular.module("Authentication")
  .controller("NavBarController", ["$scope", "$location", "AuthService", "URLService", function ($scope, $location, AuthService, URLService) {

    $scope.logIn = function () {
      if ($scope.currentAuth) {
        URLService.goToApp();
      } else {
        URLService.goToSignIn();
      }
    };

    $scope.signOut = function () {
      AuthService.signOut();
    }

  }]);
