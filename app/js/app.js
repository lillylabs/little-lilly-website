angular.module("LittleLillyApp", ["firebase", "ui.router", "angularMoment", "Backbone", "Authentication", "IG", "LittleLillyAdmin"]);

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
            templateUrl: "partial-admin.html"
          }
        },
        resolve: {
          "users": ["Auth", "Users", function (Auth, Users) {
            return Users("test").$loaded();
          }]
        }
      })
      .state("app.admin.status", {
        url: "/status",
        views: {
          "admin@app.admin": {
            templateUrl: "partial-admin-status.html",
            controller: "AdminStatusController"
          }
        }
      })
      .state("app.admin.pdf", {
        url: "/pdf",
        views: {
          "admin@app.admin": {
            templateUrl: "partial-admin-pdf.html",
            controller: "AdminPdfController"
          }
        }
      })
      .state("app.admin.labels", {
        url: "/labels",
        views: {
          "admin@app.admin": {
            templateUrl: "partial-admin-labels.html",
            controller: "AdminLabelsController"
          }
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

  }]);

angular.module("LittleLillyApp")
  .controller("ProfileController", ["$scope", "Auth", "Instagram", "moment", function ($scope, Auth, Instagram, moment) {

    $scope.authIGAccount = function () {
      Instagram.authAccount();
    };

  }]);

angular.module("LittleLillyApp")
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

      $scope.letter.timeframe.end = endMoment.add(1, "month").endOf('month').format("YYYY-MM-DD");
      $scope.letter.name = startMoment.format(startFormat);
      $scope.letter.name += " - ";
      $scope.letter.name += endMoment.format(endFormat);
      $scope.letter.$save();
    }

    $scope.readyDate = function() {
      var format = "dddd, MMMM Do";
      return moment($scope.letter.timeframe.end).add(1, "month").date(4).format(format);
    }

    $scope.shipmentDate = function() {
      var format = "dddd, MMMM Do";
      return moment($scope.letter.timeframe.end).add(1, "month").date(8).format(format);
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

  }]);

angular.module("LittleLillyApp")
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

angular.module("LittleLillyApp")
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

  }]);

angular.module("LittleLillyApp")
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
    $scope.shipmentDate = moment($scope.letter.timeframe.end).add(1, "month").date(8).format(format);
    $scope.readyDate = moment($scope.letter.timeframe.end).add(1, "month").date(4).format(format);

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

angular.module("LittleLillyApp")
  .controller("AdminController", ["$scope", "users", function ($scope, users) {

    $scope.users = users;

  }]);

angular.module("LittleLillyApp")
  .filter('range', function () {

    return function (input, total) {
      total = parseInt(total);
      for (var i = 0; i < total; i++)
        input.push(i);
      return input;
    };

  });

angular.module("LittleLillyApp")
  .filter('removeLillygramTags', function () {

    return function (input) {

      var output = input.replace("#lillygram", "");
      output = output.replace("#lilygram", "");
      output = output.replace("#lilligram", "");

      return output;

    };
  });
