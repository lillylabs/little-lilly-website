var config = {
  test: {
    apiKey: "AIzaSyA5-592fUq1D42RsZ417oIGOsiZ2101fpk",
    authDomain: "little-lilly-test.firebaseapp.com",
    databaseURL: "https://little-lilly-test.firebaseio.com",
    storageBucket: "little-lilly-test.appspot.com"
  },
  prod: {
    apiKey: "AIzaSyCXqEvxSBF76_5MnxpaMf5M5_8tysZAdJU",
    authDomain: "little-lilly.firebaseapp.com",
    databaseURL: "https://little-lilly.firebaseio.com",
    storageBucket: "little-lilly.appspot.com"
  }
};

var parse = {
  test: {
    appKey: "GVeUGJvhxfUYrQjiaPWn00MgDx0m9I8178HIvSan",
    javascriptKey: "JnfjqZx3WHsgqNpbIxU3Yp6tHD8TMy3pTSvDFmGo"
  },
  prod: {
    appKey: "JRDFv7WKBItS7VPZ3vC4Iaa7mFkY7FmNdsrImIpr",
    javascriptKey: "HGG0SJ0l9QMtmr7mwa3I97TAZBaY4t67jUtT23IZ"
  }
}

console.log(window.location.host);

if (window.location.host == 'www.littlelilly.no') {
  console.log("Firebase: Little Lilly");
  firebase.initializeApp(config.prod);
} else {
  console.log("Firebase: Little Lilly Test");
  firebase.initializeApp(config.test);
}

if (window.location.host == 'www.littlelilly.no') {
  console.log("Parse: Lillygram");
  Parse.initialize(parse.prod.appKey, parse.prod.javascriptKey);
} else {
  console.log("Parse: Lillygram Test");
  Parse.initialize(parse.test.appKey, parse.test.javascriptKey);
}

angular.module("IG", ["firebase"])
  .factory("Instagram", ["$window", "$http", "$q", "moment", function ($window, $http, $q, moment) {

      function getClientId() {
        return firebase.database().ref('config/instagram').once('value').then(function (snapshot) {
          return snapshot.val().client_id;
        });
      }

      function getRedirectUrl() {
        var redirectUrl = $window.location.protocol + "//" + $window.location.host + "/app/";
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
        };

        photo = moment(photo.created_time * 1000);

        return photo.isBetween(timeframe.start, timeframe.end, 'day', '[]');
      }

      function isNewerThanTimeFrameStart(timeframe, photo) {
        timeframe = {
          start: moment(timeframe.start)
        };

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

          if (!response.data) {
            console.log("Instagram: No response data, ", response);
            return;
          }

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

      return {
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
          };

          fetchPhotos(params);

          return deferred.promise;
        }
      };
    }
    ]);

angular.module("Backbone", ["firebase"])
  .factory("Auth", ["$firebaseAuth", function ($firebaseAuth) {

      return $firebaseAuth();
    }
    ]);

angular.module("Backbone")
  .factory("Profile", ["$firebaseObject", function ($firebaseObject) {

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
    }])
  .factory("Letter", ["$firebaseObject", "$firebaseArray", function ($firebaseObject, $firebaseArray) {

    var startMoment = moment().date(1);
    var endMoment = moment().endOf('month');

    var Letter = $firebaseObject.$extend({

      $$defaults: {
        name: startMoment.format("MMMM YYYY"),
        timeframe: {
          start: startMoment.format("YYYY-MM-DD"),
          end: endMoment.format("YYYY-MM-DD")
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
    }])
  .factory("Users", ["$firebaseArray", function ($firebaseArray) {
    return function (uid) {
      var ref = firebase.database().ref('users');
      return $firebaseArray(ref);
    };
    }])
  .factory("Archive", ["$firebaseArray", function ($firebaseArray) {
    return function (uid) {
      var ref = firebase.database().ref('users/' + uid + '/archive').limitToLast(5);
      return $firebaseArray(ref);
    }
    }])
  .service("URLService", ["$window", "$location", function ($window) {

    function goTo(path) {
      $window.location.assign(path);
    }

    this.goToHome = function () {
      goTo('/');
    };

    this.goToApp = function () {
      goTo('/app');
    };

    this.goToSignIn = function () {
      goTo('/login');
    };

    this.isApp = function () {
      return $window.location.pathname == '/app/';
    }
    }])
  .service("DataMigration", ["Profile", "Letter", function (Profile, Letter) {

    function getRecipients(parseUser) {
      var query = new Parse.Query("Recipient");
      query.equalTo("user", parseUser);
      return query.find().then(function (parseRecipients) {
        var recipients = [];
        angular.forEach(parseRecipients, function (parseRecipient) {
          recipients.push({
            name: parseRecipient.get("name"),
            address: parseRecipient.get("address")
          });
        });
        return recipients;
      })
    }

    function getDefaultGreeting(parseUser) {
      var query = new Parse.Query("Greeting");
      query.equalTo("user", parseUser);
      return query.first().then(function (parseGreeting) {
        if (parseGreeting && parseGreeting.get("reusable")) {
          return parseGreeting.get("text");
        } else {
          return null;
        }
      })
    }

    function getCreditBalance(parseUser) {
      var query = new Parse.Query("CreditsBalance");
      query.equalTo("user", parseUser);
      return query.find().then(function (parseCreditBalances) {
        if (parseCreditBalances) {
          var newCredits = parseCreditBalances[0] ? parseCreditBalances[0].get("credits") : 0;
          var oldCredits = parseCreditBalances[1] ? parseCreditBalances[1].get("credits") : 0;
          return newCredits + oldCredits;
        } else {
          return null;
        }
      })
    }

    function getName(parseUser) {
      var query = new Parse.Query("Profile");
      query.equalTo("user", parseUser);
      return query.first().then(function (parseProfile) {
        if (parseProfile) {
          return {
            firstName: parseProfile.get("firstName"),
            lastName: parseProfile.get("lastName")
          };
        } else {
          return null;
        }
      })
    }

    this.getParseUserInfo = function (parseUser) {
      var promises = [];
      promises.push(getRecipients(parseUser));
      promises.push(getDefaultGreeting(parseUser));
      promises.push(getCreditBalance(parseUser));
      promises.push(getName(parseUser));
      return Parse.Promise.when(promises).then(function (parseInfo) {
        return {
          recipients: parseInfo[0],
          greeting: parseInfo[1],
          creditBalance: parseInfo[2],
          name: parseInfo[3]
        }
      });
    }

    this.updateFirebaseUser = function (firebaseUser, userData) {
      return Profile(firebaseUser.uid).$loaded().then(function (profile) {

        if (userData.name) {
          profile.name = {
            first: userData.name.firstName ? userData.name.firstName : "",
            last: userData.name.lastName ? userData.name.lastName : ""
          };
        }

        profile.credits = userData.creditBalance;
        profile.greeting = {
          text: userData.greeting
        }

        return profile.$save();

      }).then(function () {

        return Letter(firebaseUser.uid).$loaded().then(function (letter) {

          letter.greeting = {
            text: userData.greeting
          }
          letter.recipients = userData.recipients;
          return letter.$save();
        })
      }).then(function () {
        return firebaseUser;
      });
    }
    }]);

angular.module("Authentication", ["firebase", "ui.router", "Backbone"])
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
    }])
  .controller("SignUpFormController", ["$scope", "AuthService", "URLService", function ($scope, AuthService, URLService) {

    $scope.signUp = function () {
      AuthService.signUp($scope.email, $scope.password, $scope.firstname, $scope.lastname).then(function () {
        URLService.goToApp();
      }).catch(function (error) {
        $scope.error = error.message;
      });
    };

    }])
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
    }])
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

angular.module("Authentication").run(["$rootScope", "$state", "Auth", "URLService", function ($rootScope, $state, Auth, URLService) {

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

angular.module("LittleLillyApp", ["firebase", "ui.router", "angularMoment", "Backbone", "Authentication", "IG"]);

angular.module("LittleLillyApp")
  .config(["$stateProvider", "$urlRouterProvider", function ($stateProvider, $urlRouterProvider) {

    $stateProvider
      .state("app", {
        abstract: true,
        resolve: {
          "currentAuth": ["Auth", "URLService", "$state", function (Auth, URLService, $state) {
            return Auth.$requireSignIn().catch(function (error) {
              URLService.goToSignIn();
            });
                    }],
          "profile": ["Auth", "Profile", function (Auth, Profile) {
            return Auth.$requireSignIn().then(function (auth) {
              return Profile(auth.uid).$loaded();
            });
                    }]
        }
      })
      .state("app.account", {
        url: "/account",
        views: {
          "main@": {
            templateUrl: "partial-account.html",
            controller: "AccountController"
          }
        }
      })
      .state("app.preview", {
        url: "/preview",
        views: {
          "main@": {
            templateUrl: "partial-preview.html",
            controller: "PreviewController",
          }
        },
        resolve: {
          "letter": ["Auth", "Letter", function (Auth, Letter) {
            return Auth.$requireSignIn().then(function (auth) {
              return Letter(auth.uid).$loaded();
            });
                    }]
        }
      })
      .state("app.admin", {
        url: "/admin",
        views: {
          "main@": {
            templateUrl: "partial-admin.html",
            controller: "AdminController",
          }
        },
        resolve: {
          "users": ["Auth", "Users", function (Auth, Users) {
            return Users("test").$loaded();
                    }]
        }
      })
      .state("access_token", {
        url: "/access_token=:igToken",
        resolve: {
          "currentAuth": ["$stateParams", "Auth", "Profile", "Instagram", "URLService", function ($stateParams, Auth, Profile, Instagram, URLService) {
            return Auth.$waitForSignIn().then(function (auth) {
              return Profile(auth.uid).$loaded().then(function (profile) {
                return Instagram.fetchUserInfo($stateParams.igToken).then(function (user) {
                  profile.ig_accounts = {};
                  profile.ig_accounts[user.id] = {
                    username: user.username,
                    token: $stateParams.igToken,
                    profile_picture: user.profile_picture
                  };
                  return profile.$save().catch(function (error) {
                    console.log("State 'access_token': Error saving profile, ", error);
                  });
                });
              });
            }).then(function() {
              URLService.goToApp();
            });
          }]
        }
      });
    }]);

angular.module("LittleLillyApp")
  .controller("AccountController", ["$scope", "currentAuth", "Profile", "Letter", "Archive", function ($scope, currentAuth, Profile, Letter, Archive) {

    $scope.user = currentAuth;
    $scope.letter = Letter(currentAuth.uid);
    $scope.profile = Profile(currentAuth.uid);
    $scope.archive = Archive(currentAuth.uid);

    }])

  .controller("ProfileController", ["$scope", "Auth", "Instagram", "moment", function ($scope, Auth, Instagram, moment) {

    $scope.authIGAccount = function () {
      Instagram.authAccount();
    };

    }])
  .controller("LetterController", ["$scope", "Instagram", function ($scope, Instagram) {

    function fetchIGPhotos() {
      console.log("LetterController: fetchIGPhotos()");
      Instagram.fetchPhotos($scope.profile, $scope.letter).then(function (photos) {
        $scope.letter.photos = photos;
        $scope.letter.$save();
      });
    }

    $scope.backup = {};
    $scope.showMergeWithNextMonth = function() {
      var endMoment = moment($scope.letter.timeframe.end);
      var weekBeforeEndMoment = endMoment.subtract(1, 'week');

      return moment().isSameOrAfter(weekBeforeEndMoment);
    }

    $scope.mergeWithNextMonth = function() {
      var startFormat = "MMMM YYYY";
      var endFormat = "MMMM YYYY";
      var startMoment = moment($scope.letter.timeframe.start);
      var endMoment = moment($scope.letter.timeframe.end);

      if(startMoment.year() === endMoment.year()) {
        startFormat = "MMMM";
      }

      $scope.letter.timeframe.end = endMoment.add(1, "month").format("YYYY-MM-DD");
      $scope.letter.name = startMoment.format(startFormat);
      $scope.letter.name += " - ";
      $scope.letter.name += endMoment.format(endFormat);
      $scope.letter.$save();
    }

    $scope.readyDate = function() {
      var format = "dddd, MMMM Do";
      return moment($scope.letter.timeframe.end).add(1, "month").date(5).format(format);
    } 

    $scope.shipmentDate = function() {
      var format = "dddd, MMMM Do";
      return moment($scope.letter.timeframe.end).add(1, "month").date(9).format(format);
    } 

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
      });
    })

    }])
  .controller("GreetingController", ["$scope", function ($scope) {

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

    }])
  .controller("RecipientsController", ["$scope", function ($scope) {

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
    };

    $scope.deleteRecipient = function (recipient) {
      $scope.recipients.$remove(recipient);
    };

    $scope.editRecipient = function (recipient) {
      recipient._backup = angular.copy(recipient);
      recipient._status = 'EDIT';
    };

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
    };

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

    }])
  .controller("PreviewController", ["$scope", "letter", function ($scope, letter) {

    function fetchIGPhotos() {
      Instagram.fetchPhotos($scope.profile, $scope.letter).then(function (photos) {
        $scope.letter.photos = photos;
        $scope.letter.$save();
      });
    }

    $scope.letter = letter;
    $scope.backup = {};

    var format = "dddd, MMMM Do";
    $scope.shipmentDate = moment($scope.letter.timeframe.end).add(1, "month").date(9).format(format);
    $scope.readyDate = moment($scope.letter.timeframe.end).add(1, "month").date(5).format(format);

    $scope.letter.$watch(function () {
      if (JSON.stringify($scope.letter.timeframe) !== JSON.stringify($scope.backup.timeframe)) {
        $scope.backup.timeframe = angular.copy($scope.letter.timeframe);
        fetchIGPhotos();
      }
    });

    $scope.emptyPhotoBoxCount = function () {
      if (!$scope.letter || !$scope.letter.photos)
        return 3;

      var emptyBoxCount = 4 - (($scope.letter.photos.length + 1) % 4);

      return emptyBoxCount < 4 ? emptyBoxCount : 0;
    };

    }])
  .controller("AdminController", ["$scope", "users", function ($scope, users) {
    $scope.users = users;
    }])
  .filter('range', function () {
    return function (input, total) {
      total = parseInt(total);
      for (var i = 0; i < total; i++)
        input.push(i);
      return input;
    };
  })
  .filter('removeLillygramTags', function () {

    return function (input) {

      var output = input.replace("#lillygram", "");
      output = output.replace("#lilygram", "");
      output = output.replace("#lilligram", "");

      return output;

    };
  });
