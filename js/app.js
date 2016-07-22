var config = {
  apiKey: "AIzaSyA5-592fUq1D42RsZ417oIGOsiZ2101fpk",
  authDomain: "little-lilly-test.firebaseapp.com",
  databaseURL: "https://little-lilly-test.firebaseio.com",
  storageBucket: "little-lilly-test.appspot.com",
};
firebase.initializeApp(config);

var app = angular.module("LittleLillyApp", ["firebase", "ui.router", "angularMoment"]);

app.factory("Config", [
  function () {

    var config = {
      instagramClientId: function () {
        return firebase.database().ref('/instagram').once('value').then(function (snapshot) {
          return snapshot.val().client_id;
        });
      }
    }

    return config;
  }
]);

app.factory("Auth", ["$firebaseAuth",
  function ($firebaseAuth) {
    return $firebaseAuth();
  }
]);

app.factory("Profile", ["$firebaseObject",
  function ($firebaseObject) {
    return function (uid) {
      var ref = firebase.database().ref('users/' + uid + '/profile');
      return $firebaseObject(ref);
    }
  }
]);

app.factory("Letter", ["$firebaseObject",
  function ($firebaseObject) {
    return function (uid) {
      var ref = firebase.database().ref('users/' + uid + '/letter');
      return $firebaseObject(ref);
    }
  }
]);

app.factory("Archive", ["$firebaseArray",
  function ($firebaseArray) {
    return function (uid) {
      var ref = firebase.database().ref('users/' + uid + '/archive').limitToLast(5);
      return $firebaseArray(ref);
    }
  }
]);

app.factory("Instagram", ["$window", "$http", "$q", "moment", "Config",
  function ($window, $http, $q, moment, Config) {

    function getRedirectUrl() {
      var redirectUrl = $window.location.host;
      if (redirectUrl.indexOf('localhost' >= 0)) {
        redirectUrl = 'http://' + redirectUrl + '/app/';
      }
      return redirectUrl;
    }

    function goToAuthUrl(clientId, redirectUrl) {
      var url = 'https://api.instagram.com/oauth/authorize/?client_id=' + clientId + '&redirect_uri=' + redirectUrl + '&response_type=token';
      $window.location.assign(url);
    }

    function isSelected(photo) {
      var TAGS = ['lillygram', 'lillygram'];
      var isSelected = false;
      angular.forEach(TAGS, function (TAG) {
        if(photo.tags.toString().indexOf(TAG) > -1) {
          isSelected = true;
        }
      });
      return isSelected;
    }

    function isWithinTimeframe(timeframe, photo) {
      timeframe = {
        start: moment(timeframe.start),
        end: moment(timeframe.end)
      }

      photo = moment(photo.created_time * 1000);

      return photo.isBetween(timeframe.start, timeframe.end, 'day', '[]');
    }

    function isNewerThanTimeFrameStart(timeframe, photo) {
      timeframe = {
        start: moment(timeframe.start)
      }

      photo = moment(photo.created_time * 1000);

      return photo.isAfter(timeframe.start, 'day', '[]');
    }

    function filterPhotos(photos, timeframe) {
      var filtredPhotos = [];
      angular.forEach(photos, function (photo) {
        if (isSelected(photo) && isWithinTimeframe(timeframe, photo)) {
          this.push(photo);
        }
      }, filtredPhotos);
      return filtredPhotos;
    }

    function fetchPhotos(params) {

      var url = 'https://api.instagram.com/v1/users/self/media/recent/';
      url += '?access_token=' + params.token;
      url += '&count=' + '5';
      url += '&callback=JSON_CALLBACK';


      if (params.pagination && params.pagination.next_max_id) {
        url += '&max_id=' + params.pagination.next_max_id;
      }

      if (params.pagination && params.pagination.next_min_id) {
        url += '&min_id=' + params.pagination.next_min_id;
      }

      $http.jsonp(url).success(function (response) {
        console.log(response.data);
        if (!params.photos) {
          params.photos = response.data;
        } else {
          params.photos = params.photos.concat(response.data);
        }

        if (response.pagination && response.pagination.next_url && isNewerThanTimeFrameStart(params.timeframe, params.photos[params.photos.length-1])) {
          params.pagination = response.pagination;
          fetchPhotos(params);
        } else {
          console.log(params.photos);
          params.deferred.resolve(filterPhotos(params.photos, params.timeframe).reverse());
        }
      });
    }

    var instagram = {
      auth: function () {
        Config.instagramClientId().then(function (clientId) {
          goToAuthUrl(clientId, getRedirectUrl());
        });
      },
      user: function (igToken) {
        var url = 'https://api.instagram.com/v1/users/self/';
        url += '?access_token=' + igToken;
        url += '&callback=JSON_CALLBACK';

        var deferred = $q.defer();

        $http.jsonp(url).success(function (response) {
          deferred.resolve(response.data);
        });

        return deferred.promise;
      },
      photos: function (token, timeframe) {
        var deferred = $q.defer();

        var params = {
          token: token,
          timeframe: timeframe,
          deferred: deferred
        }

        fetchPhotos(params);

        return deferred.promise;
      }
    }

    return instagram;
  }
]);

app.filter('username', function () {

  return function (name) {
    var username = "";

    if (!name) {
      return username;
    }

    if (name.first && name.last) {
      username = name.first + " " + name.last;
    } else if (name.first) {
      username = name.first;
    } else if (name.last) {
      username = name.last;
    }

    return username;
  }

});

// for ui-router
app.run(["$rootScope", "$state", "Auth", function ($rootScope, $state, Auth) {

  Auth.$onAuthStateChanged(function (firebaseUser) {
    if (firebaseUser !== null) {
      $state.go("account");
    } else {
      $state.go("login");
    }
  });

}]);

app.config(function ($stateProvider, $locationProvider, $urlRouterProvider) {

  $stateProvider
    .state("login", {
      url: "/login",
      templateUrl: "partial-login.html",
      controller: "LoginController",
      resolve: {
        "currentAuth": ["Auth", function (Auth) {
          return Auth.$waitForSignIn();
        }]
      }
    })
    .state("account", {
      url: "/account",
      templateUrl: "partial-account.html",
      controller: "AccountController",
      resolve: {
        "currentAuth": ["Auth", "$state", function (Auth, $state) {
          return Auth.$requireSignIn().catch(function () {
            $state.go('login');
          });
        }],
        "profile": ["Auth", "Profile", function (Auth, Profile) {
          return Auth.$requireSignIn().then(function (auth) {
            return Profile(auth.uid).$loaded();
          });
        }]
      }
    })
    .state("access_token", {
      url: "/access_token=:igToken",
      resolve: {
        "currentAuth": ["$stateParams", "Auth", "Profile", "Instagram", function ($stateParams, Auth, Profile, Instagram) {
          return Auth.$waitForSignIn().then(function (auth) {
            return Profile(auth.uid).$loaded().then(function (profile) {
              return Instagram.user($stateParams.igToken).then(function (user) {
                profile.ig_accounts = {};
                profile.ig_accounts[user.id] = {
                  username: user.username,
                  token: $stateParams.igToken,
                  profile_picture: user.profile_picture
                }
                return profile.$save().catch(function (error) {
                  console.log('Error saving profile', error);
                });
              });
            });
          });
        }]
      }
    });

  // Send to login if the URL was not found
  $urlRouterProvider.otherwise("account");
});

app.controller("AccountController", ["$scope", "currentAuth", "Auth", "Profile", "Letter", "Archive", "Instagram",
  function ($scope, currentAuth, Auth, Profile, Letter, Archive, Instagram) {

    function igToken(igAccounts) {
      var igToken = null;
      angular.forEach($scope.profile.ig_accounts, function (value) {
        igToken = value.token;
      });
      return igToken;
    }

    function fetchIGPhotos() {
      console.log("Fetch ig photos");
      if ($scope.profile.ig_accounts) {
        Instagram.photos(igToken($scope.profile.ig_accounts), $scope.letter.timeframe).then(function (photos) {
          $scope.letter.photos = photos;
        });
      } else {
        $scope.letter.photos = [];
      }
    }

    $scope.user = currentAuth;
    $scope.profile = Profile(currentAuth.uid);
    $scope.letter = Letter(currentAuth.uid);
    $scope.archive = Archive(currentAuth.uid);
    $scope.instagramAuth = Instagram.auth;

    $scope.profile.$loaded().then(function (profile) {
      return $scope.letter.$loaded();
    }).then(function () {
      fetchIGPhotos();

      $scope.profile.$watch(function () {
        fetchIGPhotos();
      });

      $scope.letter.$watch(function () {
        fetchIGPhotos();
      });
    });

    $scope.signOut = function () {
      Auth.$signOut();
    };
  }
]);

app.controller("LoginController", ["$scope", "$state", "Auth",
  function ($scope, $state, Auth) {
    $scope.signIn = function () {
      Auth.$signInWithEmailAndPassword($scope.email, $scope.password).catch(function (error) {
        console.log("Error", error);
        $scope.error = error.message;
      });
    };
  }
]);
