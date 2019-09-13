"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.RedisCacheAdapter = void 0;

var _redis = _interopRequireDefault(require("redis"));

var _logger = _interopRequireDefault(require("../../../logger"));

var _KeyPromiseQueue = require("./KeyPromiseQueue");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const DEFAULT_REDIS_TTL = 30 * 1000; // 30 seconds in milliseconds

const FLUSH_DB_KEY = '__flush_db__';

function debug() {
  _logger.default.debug.apply(_logger.default, ['RedisCacheAdapter', ...arguments]);
}

const isValidTTL = ttl => typeof ttl === 'number' && ttl > 0;

class RedisCacheAdapter {
  constructor(redisCtx, ttl = DEFAULT_REDIS_TTL) {
    this.ttl = isValidTTL(ttl) ? ttl : DEFAULT_REDIS_TTL;
    this.client = _redis.default.createClient(redisCtx);
    this.queue = new _KeyPromiseQueue.KeyPromiseQueue();
  }

  get(key) {
    debug('get', key);
    return this.queue.enqueue(key, () => new Promise(resolve => {
      this.client.get(key, function (err, res) {
        debug('-> get', key, res);

        if (!res) {
          return resolve(null);
        }

        resolve(JSON.parse(res));
      });
    }));
  }

  put(key, value, ttl = this.ttl) {
    value = JSON.stringify(value);
    debug('put', key, value, ttl);

    if (ttl === 0) {
      // ttl of zero is a logical no-op, but redis cannot set expire time of zero
      return this.queue.enqueue(key, () => Promise.resolve());
    }

    if (ttl === Infinity) {
      return this.queue.enqueue(key, () => new Promise(resolve => {
        this.client.set(key, value, function () {
          resolve();
        });
      }));
    }

    if (!isValidTTL(ttl)) {
      ttl = this.ttl;
    }

    return this.queue.enqueue(key, () => new Promise(resolve => {
      this.client.psetex(key, ttl, value, function () {
        resolve();
      });
    }));
  }

  del(key) {
    debug('del', key);
    return this.queue.enqueue(key, () => new Promise(resolve => {
      this.client.del(key, function () {
        resolve();
      });
    }));
  }

  clear() {
    debug('clear');
    return this.queue.enqueue(FLUSH_DB_KEY, () => new Promise(resolve => {
      this.client.flushdb(function () {
        resolve();
      });
    }));
  }

}

exports.RedisCacheAdapter = RedisCacheAdapter;
var _default = RedisCacheAdapter;
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9BZGFwdGVycy9DYWNoZS9SZWRpc0NhY2hlQWRhcHRlci9pbmRleC5qcyJdLCJuYW1lcyI6WyJERUZBVUxUX1JFRElTX1RUTCIsIkZMVVNIX0RCX0tFWSIsImRlYnVnIiwibG9nZ2VyIiwiYXBwbHkiLCJhcmd1bWVudHMiLCJpc1ZhbGlkVFRMIiwidHRsIiwiUmVkaXNDYWNoZUFkYXB0ZXIiLCJjb25zdHJ1Y3RvciIsInJlZGlzQ3R4IiwiY2xpZW50IiwicmVkaXMiLCJjcmVhdGVDbGllbnQiLCJxdWV1ZSIsIktleVByb21pc2VRdWV1ZSIsImdldCIsImtleSIsImVucXVldWUiLCJQcm9taXNlIiwicmVzb2x2ZSIsImVyciIsInJlcyIsIkpTT04iLCJwYXJzZSIsInB1dCIsInZhbHVlIiwic3RyaW5naWZ5IiwiSW5maW5pdHkiLCJzZXQiLCJwc2V0ZXgiLCJkZWwiLCJjbGVhciIsImZsdXNoZGIiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFBQTs7QUFDQTs7QUFDQTs7OztBQUVBLE1BQU1BLGlCQUFpQixHQUFHLEtBQUssSUFBL0IsQyxDQUFxQzs7QUFDckMsTUFBTUMsWUFBWSxHQUFHLGNBQXJCOztBQUVBLFNBQVNDLEtBQVQsR0FBaUI7QUFDZkMsa0JBQU9ELEtBQVAsQ0FBYUUsS0FBYixDQUFtQkQsZUFBbkIsRUFBMkIsQ0FBQyxtQkFBRCxFQUFzQixHQUFHRSxTQUF6QixDQUEzQjtBQUNEOztBQUVELE1BQU1DLFVBQVUsR0FBR0MsR0FBRyxJQUFJLE9BQU9BLEdBQVAsS0FBZSxRQUFmLElBQTJCQSxHQUFHLEdBQUcsQ0FBM0Q7O0FBRU8sTUFBTUMsaUJBQU4sQ0FBd0I7QUFDN0JDLEVBQUFBLFdBQVcsQ0FBQ0MsUUFBRCxFQUFXSCxHQUFHLEdBQUdQLGlCQUFqQixFQUFvQztBQUM3QyxTQUFLTyxHQUFMLEdBQVdELFVBQVUsQ0FBQ0MsR0FBRCxDQUFWLEdBQWtCQSxHQUFsQixHQUF3QlAsaUJBQW5DO0FBQ0EsU0FBS1csTUFB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VCxNQUFMLENBQVlzQixPQUFaLENBQW9CLFlBQVc7QUFDN0JiLFFBQUFBLE9BQU87QUFDUixPQUZEO0FBR0QsS0FKRCxDQUhHLENBQVA7QUFTRDs7QUFwRjRCOzs7ZUF1RmhCWixpQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCByZWRpcyBmcm9tICdyZWRpcyc7XG5pbXBvcnQgbG9nZ2VyIGZyb20gJy4uLy4uLy4uL2xvZ2dlcic7XG5pbXBvcnQgeyBLZXlQcm9taXNlUXVldWUgfSBmcm9tICcuL0tleVByb21pc2VRdWV1ZSc7XG5cbmNvbnN0IERFRkFVTFRfUkVESVNfVFRMID0gMzAgKiAxMDAwOyAvLyAzMCBzZWNvbmRzIGluIG1pbGxpc2Vjb25kc1xuY29uc3QgRkxVU0hfREJfS0VZID0gJ19fZmx1c2hfZGJfXyc7XG5cbmZ1bmN0aW9uIGRlYnVnKCkge1xuICBsb2dnZXIuZGVidWcuYXBwbHkobG9nZ2VyLCBbJ1JlZGlzQ2FjaGVBZGFwdGVyJywgLi4uYXJndW1lbnRzXSk7XG59XG5cbmNvbnN0IGlzVmFsaWRUVEwgPSB0dGwgPT4gdHlwZW9mIHR0bCA9PT0gJ251bWJlcicgJiYgdHRsID4gMDtcblxuZXhwb3J0IGNsYXNzIFJlZGlzQ2FjaGVBZGFwdGVyIHtcbiAgY29uc3RydWN0b3IocmVkaXNDdHgsIHR0bCA9IERFRkFVTFRfUkVESVNfVFRMKSB7XG4gICAgdGhpcy50dGwgPSBpc1ZhbGlkVFRMKHR0bCkgPyB0dGwgOiBERUZBVUxUX1JFRElTX1RUTDtcbiAgICB0aGlzLmNsaWVudCA9IHJlZGlzLmNyZWF0ZUNsaWVudChyZWRpc0N0eCk7XG4gICAgdGhpcy5xdWV1ZSA9IG5ldyBLZXlQcm9taXNlUXVldWUoKTtcbiAgfVxuXG4gIGdldChrZXkpIHtcbiAgICBkZWJ1ZygnZ2V0Jywga2V5KTtcbiAgICByZXR1cm4gdGhpcy5xdWV1ZS5lbnF1ZXVlKFxuICAgICAga2V5LFxuICAgICAgKCkgPT5cbiAgICAgICAgbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgICAgdGhpcy5jbGllbnQuZ2V0KGtleSwgZnVuY3Rpb24oZXJyLCByZXMpIHtcbiAgICAgICAgICAgIGRlYnVnKCctPiBnZXQnLCBrZXksIHJlcyk7XG4gICAgICAgICAgICBpZiAoIXJlcykge1xuICAgICAgICAgICAgICByZXR1cm4gcmVzb2x2ZShudWxsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc29sdmUoSlNPTi5wYXJzZShyZXMpKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSlcbiAgICApO1xuICB9XG5cbiAgcHV0KGtleSwgdmFsdWUsIHR0bCA9IHRoaXMudHRsKSB7XG4gICAgdmFsdWUgPSBKU09OLnN0cmluZ2lmeSh2YWx1ZSk7XG4gICAgZGVidWcoJ3B1dCcsIGtleSwgdmFsdWUsIHR0bCk7XG5cbiAgICBpZiAodHRsID09PSAwKSB7XG4gICAgICAvLyB0dGwgb2YgemVybyBpcyBhIGxvZ2ljYWwgbm8tb3AsIGJ1dCByZWRpcyBjYW5ub3Qgc2V0IGV4cGlyZSB0aW1lIG9mIHplcm9cbiAgICAgIHJldHVybiB0aGlzLnF1ZXVlLmVucXVldWUoa2V5LCAoKSA9PiBQcm9taXNlLnJlc29sdmUoKSk7XG4gICAgfVxuXG4gICAgaWYgKHR0bCA9PT0gSW5maW5pdHkpIHtcbiAgICAgIHJldHVybiB0aGlzLnF1ZXVlLmVucXVldWUoXG4gICAgICAgIGtleSxcbiAgICAgICAgKCkgPT5cbiAgICAgICAgICBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgICAgIHRoaXMuY2xpZW50LnNldChrZXksIHZhbHVlLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfVxuXG4gICAgaWYgKCFpc1ZhbGlkVFRMKHR0bCkpIHtcbiAgICAgIHR0bCA9IHRoaXMudHRsO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnF1ZXVlLmVucXVldWUoXG4gICAgICBrZXksXG4gICAgICAoKSA9PlxuICAgICAgICBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgICB0aGlzLmNsaWVudC5wc2V0ZXgoa2V5LCB0dGwsIHZhbHVlLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSlcbiAgICApO1xuICB9XG5cbiAgZGVsKGtleSkge1xuICAgIGRlYnVnKCdkZWwnLCBrZXkpO1xuICAgIHJldHVybiB0aGlzLnF1ZXVlLmVucXVldWUoXG4gICAgICBrZXksXG4gICAgICAoKSA9PlxuICAgICAgICBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgICB0aGlzLmNsaWVudC5kZWwoa2V5LCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSlcbiAgICApO1xuICB9XG5cbiAgY2xlYXIoKSB7XG4gICAgZGVidWcoJ2NsZWFyJyk7XG4gICAgcmV0dXJuIHRoaXMucXVldWUuZW5xdWV1ZShcbiAgICAgIEZMVVNIX0RCX0tFWSxcbiAgICAgICgpID0+XG4gICAgICAgIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICAgIHRoaXMuY2xpZW50LmZsdXNoZGIoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pXG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBSZWRpc0NhY2hlQWRhcHRlcjtcbiJdfQ==