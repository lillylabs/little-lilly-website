var config = {
  apiKey: "AIzaSyA5-592fUq1D42RsZ417oIGOsiZ2101fpk",
  authDomain: "little-lilly-test.firebaseapp.com",
  databaseURL: "https://little-lilly-test.firebaseio.com",
  storageBucket: "little-lilly-test.appspot.com",
};
firebase.initializeApp(config);

var app = angular.module("LittleLillyApp", ["firebase", "ui.router"]);

app.factory("Auth", ["$firebaseAuth",
  function($firebaseAuth) {
    return $firebaseAuth();
  }
]);

app.factory("Profile", ["$firebaseObject",
  function($firebaseObject) {
    return function(uid) {
      var ref = firebase.database().ref('users/' + uid + '/profile');
      return $firebaseObject(ref);
    }
  }
]);

app.factory("Letter", ["$firebaseObject",
  function($firebaseObject) {
    return function(uid) {
      var ref = firebase.database().ref('users/' + uid + '/letter');
      return $firebaseObject(ref);
    }
  }
]);

app.factory("Archive", ["$firebaseArray",
  function($firebaseArray) {
    return function(uid) {
      var ref = firebase.database().ref('users/' + uid + '/archive').limitToLast(5);;
      return $firebaseArray(ref);
    }
  }
]);

app.filter('username', function() {

  return function(name) {
    var username = "";

    if(!name) {
      return username;
    }

    if(name.first && name.last) {
      username = name.first + " " + name.last;
    } else if(name.first) {
      username = name.first;
    } else if(name.last) {
      username = name.last;
    }

    return username;
  }

});

// for ui-router
app.run(["$rootScope", "$state", "Auth", function($rootScope, $state, Auth) {

  Auth.$onAuthStateChanged(function(firebaseUser) {
    if(firebaseUser !== null) {
      $state.transitionTo("account");
    } else {
      $state.transitionTo("login");
    }
  });

}]);

app.config(function($stateProvider, $locationProvider, $urlRouterProvider){

  $stateProvider
    .state("login", {
      url: "/login",
      templateUrl: "partial-login.html",
      controller: "LoginController",
      resolve: {
        "currentAuth": ["Auth", function(Auth) {
          return Auth.$waitForSignIn();
        }]
      }
    })
    .state("account", {
      url: "/account",
      templateUrl: "partial-account.html",
      controller: "AccountController",
      resolve: {
        "currentAuth": ["Auth", function(Auth) {
          return Auth.$requireSignIn().catch(function(){
            $state.go('login');
          });
        }],
        "profile": ["Auth", "Profile", function(Auth, Profile) {
          return Auth.$requireSignIn().then(function(auth){
            return Profile(auth.uid).$loaded();
          });
        }]
      }
    });
  // Send to login if the URL was not found
  $urlRouterProvider.otherwise("account");
});

app.controller("AccountController", ["$scope", "currentAuth", "Auth", "Profile" ,"Letter", "Archive",
  function($scope, currentAuth, Auth, Profile, Letter, Archive) {
    $scope.user = currentAuth;
    $scope.profile = Profile(currentAuth.uid);
    $scope.letter = Letter(currentAuth.uid);
    $scope.archive = Archive(currentAuth.uid);

    $scope.signOut = function() {
      Auth.$signOut();
    };
  }
]);

app.controller("LoginController", ["$scope", "$state", "Auth",
  function($scope, $state, Auth) {
    $scope.signIn = function() {
      Auth.$signInWithEmailAndPassword($scope.email, $scope.password).catch(function(error) {
        console.log("Error", error);
      });
    };
  }
]);
