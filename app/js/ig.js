angular.module("IG", ["firebase"]);

angular.module("IG")
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
