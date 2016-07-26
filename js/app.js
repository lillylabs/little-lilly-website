var config = {
  apiKey: "AIzaSyA5-592fUq1D42RsZ417oIGOsiZ2101fpk",
  authDomain: "little-lilly-test.firebaseapp.com",
  databaseURL: "https://little-lilly-test.firebaseio.com",
  storageBucket: "little-lilly-test.appspot.com",
};
firebase.initializeApp(config);

angular.module("IG", ["firebase"])
  .factory("Instagram", ["$window", "$http", "$q", "moment",
    function ($window, $http, $q, moment) {

      function getClientId() {
        return firebase.database().ref('/instagram').once('value').then(function (snapshot) {
          return snapshot.val().client_id;
        });
      }

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
          if (photo.tags.toString().indexOf(TAG) > -1) {
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

        if (!params.token) {
          return params.deferred.resolve();
        }

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
          console.log("Instagram: Response data, ", response.data);
          if (!params.photos) {
            params.photos = response.data;
          } else {
            params.photos = params.photos.concat(response.data);
          }

          if (response.pagination && response.pagination.next_url && isNewerThanTimeFrameStart(params.timeframe, params.photos[params.photos.length - 1])) {
            params.pagination = response.pagination;
            fetchPhotos(params);
          } else {
            console.log("Instagram: Params photos, ", params.photos);
            var filteredPhotos = filterPhotos(params.photos, params.timeframe).reverse();
            params.deferred.resolve(filteredPhotos);
          }
        });
      }

      var instagram = {
        authAccount: function () {
          getClientId().then(function (clientId) {
            goToAuthUrl(clientId, getRedirectUrl());
          });
        },
        fetchUserInfo: function (igToken) {
          var url = 'https://api.instagram.com/v1/users/self/';
          url += '?access_token=' + igToken;
          url += '&callback=JSON_CALLBACK';

          var deferred = $q.defer();

          $http.jsonp(url).success(function (response) {
            deferred.resolve(response.data);
          });

          return deferred.promise;
        },
        fetchPhotos: function (profile, letter) {
          var deferred = $q.defer();

          var params = {
            token: profile.igToken(),
            timeframe: letter.timeframe,
            deferred: deferred
          }

          fetchPhotos(params);

          return deferred.promise;
        }
      }

      return instagram;
  }
]);

angular.module("Backbone", ["firebase"])
  .factory("Auth", ["$firebaseAuth",
    function ($firebaseAuth) {
      return $firebaseAuth();
    }
]).factory("Profile", ["$firebaseObject",
    function ($firebaseObject) {

      var Profile = $firebaseObject.$extend({
        getFullName: function () {
          if (this.name) {
            return this.name.first + " " + this.name.last;
          }
        },
        igToken: function () {
          if (this.ig_accounts) {
            return this.ig_accounts[Object.keys(this.ig_accounts)[0]].token;
          }
        }
      });

      return function (uid) {
        var ref = firebase.database().ref('users/' + uid + '/profile');
        return new Profile(ref);
      }
  }
]).factory("Letter", ["$firebaseObject", "$firebaseArray",
  function ($firebaseObject, $firebaseArray) {

      var Letter = $firebaseObject.$extend({

        $$defaults: {
          name: "July 2016",
          timeframe: {
            start: "2016-07-01",
            end: "2016-07-31"
          }
        },
        getGreeting: function () {
          return $firebaseObject(this.$ref().child('greeting'));
        },
        getRecipients: function () {
          return $firebaseArray(this.$ref().child('recipients'));
        }

      });

      return function (uid) {
        var ref = firebase.database().ref('users/' + uid + '/letter');
        return new Letter(ref);
      }
  }
]).factory("Archive", ["$firebaseArray",
  function ($firebaseArray) {
      return function (uid) {
        var ref = firebase.database().ref('users/' + uid + '/archive').limitToLast(5);
        return $firebaseArray(ref);
      }
  }
]).service("URLService", ["$window",
  function ($window) {

      var baseUrl = $window.location.host;

      if (baseUrl.indexOf('localhost' >= 0)) {
        baseUrl = "http://" + baseUrl
      }

      function goTo(path) {
        $window.location.assign(baseUrl + path);
      }

      this.goToApp = function () {
        goTo('/app');
      }

      this.goToSignIn = function () {
        goTo('/login');
      }

      this.goToSignUp = function () {
        goTo('/#signup');
      }
  }
]);

angular.module("AuthApp", ["firebase", "ui.router", "Backbone"])
  .service("AuthService", ["$q", "$firebaseAuth", "Auth", "Profile",
    function ($q, $firebaseAuth, Auth, Profile) {

      this.signUp = function (email, password, firstname, lastname) {
        return Auth.$createUserWithEmailAndPassword(email, password)
          .then(function (firebaseUser) {
            console.log("Auth: User " + firebaseUser.uid + " created successfully!");
            var profile = Profile(firebaseUser.uid);
            profile.name = {
              first: firstname ? firstname : "",
              last: lastname ? lastname : "",
            };
            return profile.$save();
          }).catch(function (error) {
            console.error("Error: ", error);
            return $q.reject(error);
          });
      }

      this.signIn = function (email, password) {
        return Auth.$signInWithEmailAndPassword(email, password).catch(function (error) {
          console.log("LoginController: Error, ", error);
          return $q.reject(error);
        });
      }
  }
]).controller("SignUpController", ["$scope", "$window", "AuthService",
    function ($scope, $window, AuthService) {

      $scope.signUp = function () {
        AuthService.signUp($scope.email, $scope.password, $scope.firstname, $scope.lastname).then(function () {
          var url = 'http://' + $window.location.host + '/app';
          $window.location.assign(url);
        }).catch(function (error) {
          $scope.error = error.message;
        });
      };

  }
]).controller("SignInController", ["$scope", "$window", "AuthService",
    function ($scope, $window, AuthService) {

      $scope.signIn = function () {
        AuthService.signIn($scope.email, $scope.password).then(function () {
          var url = 'http://' + $window.location.host + '/app';
          $window.location.assign(url);
        }).catch(function (error) {
          $scope.error = error.message;
        });
      };
  }
]);

angular.module("LittleLillyApp", ["firebase", "ui.router", "angularMoment", "Backbone", "IG"])
  .run(["$rootScope", "$state", "Auth", "URLService", function ($rootScope, $state, Auth, URLService) {

    Auth.$onAuthStateChanged(function (firebaseUser) {
      if (!firebaseUser) {
        URLService.goToSignIn();
      } else {
        $state.go("account");
      }
    });

}]).config(function ($stateProvider, $locationProvider, $urlRouterProvider) {

    $urlRouterProvider.otherwise("app");

    $stateProvider
      .state("app", {
        url: "/"
      })
      .state("account", {
        url: "/account",
        templateUrl: "partial-account.html",
        controller: "AccountController",
        resolve: {
          "currentAuth": ["Auth", "$state", function (Auth, $state) {
            return Auth.$requireSignIn();
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
                return Instagram.fetchUserInfo($stateParams.igToken).then(function (user) {
                  profile.ig_accounts = {};
                  profile.ig_accounts[user.id] = {
                    username: user.username,
                    token: $stateParams.igToken,
                    profile_picture: user.profile_picture
                  }
                  return profile.$save().catch(function (error) {
                    console.log("State 'access_token': Error saving profile, ", error);
                  });
                });
              });
            });
        }]
        }
      });
  });

angular.module("LittleLillyApp").controller("AccountController", ["$scope", "currentAuth", "Profile", "Letter", "Archive",
  function ($scope, currentAuth, Profile, Letter, Archive) {

    $scope.user = currentAuth;
    $scope.letter = Letter(currentAuth.uid);
    $scope.profile = Profile(currentAuth.uid);
    $scope.archive = Archive(currentAuth.uid);

    console.log($scope.letter);
  }
]);

angular.module("LittleLillyApp").controller("ProfileController", ["$scope", "Auth", "Instagram",
  function ($scope, Auth, Instagram) {

    $scope.authIGAccount = function () {
      Instagram.authAccount();
    };

    $scope.signOut = function () {
      Auth.$signOut();
    };

  }
]);

angular.module("LittleLillyApp").controller("LetterController", ["$scope", "Instagram",
  function ($scope, Instagram) {

    function fetchIGPhotos() {
      console.log("LetterController: fetchIGPhotos()");
      Instagram.fetchPhotos($scope.profile, $scope.letter).then(function (photos) {
        $scope.letter.photos = photos;
        $scope.letter.$save();
      });
    }

    console.log($scope.letter);

    $scope.backup = {};

    $scope.profile.$loaded().then(function () {
      return $scope.letter.$loaded();
    }).then(function () {
      fetchIGPhotos();
      $scope.backup.igToken = angular.copy($scope.profile.igToken());
      $scope.backup.timeframe = angular.copy($scope.letter.timeframe);

      $scope.profile.$watch(function () {
        if ($scope.profile.igToken() !== $scope.backup.igToken) {
          $scope.backup.igToken = angular.copy($scope.profile.igToken());
          fetchIGPhotos();
        }
      });

      $scope.letter.$watch(function () {
        if (JSON.stringify($scope.letter.timeframe) !== JSON.stringify($scope.backup.timeframe)) {
          $scope.backup.timeframe = angular.copy($scope.letter.timeframe);
          fetchIGPhotos();
        }
      });;
    })
  }
]);

angular.module("LittleLillyApp").controller("GreetingController", ["$scope",
  function ($scope) {

    $scope.status = 'PREVIEW';
    $scope.greeting = $scope.letter.getGreeting();

    $scope.$watch('status', function () {

      switch ($scope.status) {
      case 'EDIT':
        $scope.backup = angular.copy($scope.greeting.text);
        break;
      case 'SAVE':
        $scope.status = 'PROCESS';
        $scope.greeting.$save().then(function () {
          $scope.status = 'PREVIEW';
        });
        break;
      case 'CANCEL':
        $scope.greeting.text = $scope.backup;
        $scope.status = 'PREVIEW';
        break;
      }
    });

  }
]);

angular.module("LittleLillyApp").controller("RecipientsController", ["$scope",
  function ($scope) {

    $scope.recipients = $scope.letter.getRecipients();
    $scope.newRecipient = null;

    $scope.recipients.$loaded(function () {
      angular.forEach($scope.recipients, function (recipient) {
        recipient._status = 'PREVIEW';
      });
    });

    $scope.addRecipient = function () {
      $scope.newRecipient = {};
      $scope.editRecipient($scope.newRecipient);
      $scope.recipients.push($scope.newRecipient);
    }

    $scope.deleteRecipient = function (recipient) {
      $scope.recipients.$remove(recipient);
    }

    $scope.editRecipient = function (recipient) {
      recipient._backup = angular.copy(recipient);
      recipient._status = 'EDIT';
    }

    $scope.saveRecipient = function (recipient) {
      recipient._status = 'PROCESS';
      if (recipient == $scope.newRecipient) {
        $scope.newRecipient = null;
        $scope.recipients.$add(recipient).then(function (ref) {
          $scope.recipients.splice($scope.recipients.$indexFor($scope.newRecipient), 1);
          $scope.recipients.$getRecord(ref.key)._status = 'PREVIEW';
        });
      } else {
        $scope.recipients.$save(recipient).then(function () {
          recipient._status = 'PREVIEW';
        });
      }
    }

    $scope.revertRecipient = function (recipient) {
      if (recipient == $scope.newRecipient) {
        $scope.recipients.splice($scope.recipients.$indexFor($scope.newRecipient), 1);
        $scope.newRecipient = null;
      } else {
        recipient.name = recipient._backup.name;
        recipient.address = recipient._backup.address;
        recipient._status = 'PREVIEW';
      }
    }

  }
]);
