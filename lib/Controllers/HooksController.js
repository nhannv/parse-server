"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.HooksController = undefined;

var _triggers = require("../triggers");

var triggers = _interopRequireWildcard(_triggers);

var _node = require("parse/node");

var Parse = _interopRequireWildcard(_node);

var _request = require("request");

var request = _interopRequireWildcard(_request);

var _logger = require("../logger");

var _http = require("http");

var _http2 = _interopRequireDefault(_http);

var _https = require("https");

var _https2 = _interopRequireDefault(_https);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

// -disable-next
/**  weak */

const DefaultHooksCollectionName = "_Hooks";
// -disable-next

const HTTPAgents = {
  http: new _http2.default.Agent({ keepAlive: true }),
  https: new _https2.default.Agent({ keepAlive: true })
};

class HooksController {

  constructor(applicationId, databaseController, webhookKey) {
    this._applicationId = applicationId;
    this._webhookKey = webhookKey;
    this.database = databaseController;
  }

  load() {
    return this._getHooks().then(hooks => {
      hooks = hooks || [];
      hooks.forEach(hook => {
        this.addHookToTriggers(hook);
      });
    });
  }

  getFunction(functionName) {
    return this._getHooks({ functionName: functionName }).then(results => results[0]);
  }

  getFunctions() {
    return this._getHooks({ functionName: { $exists: true } });
  }

  getTrigger(className, triggerName) {
    return this._getHooks({ className: className, triggerName: triggerName }).then(results => results[0]);
  }

  getTriggers() {
    return this._getHooks({ className: { $exists: true }, triggerName: { $exists: true } });
  }

  deleteFunction(functionName) {
    triggers.removeFunction(functionName, this._applicationId);
    return this._removeHooks({ functionName: functionName });
  }

  deleteTrigger(className, triggerName) {
    triggers.removeTrigger(triggerName, className, this._applicationId);
    return this._removeHooks({ className: className, triggerName: triggerName });
  }

  _getHooks(query = {}) {
    return this.database.find(DefaultHooksCollectionName, query).then(results => {
      return results.map(result => {
        delete result.objectId;
        return result;
      });
    });
  }

  _removeHooks(query) {
    return this.database.destroy(DefaultHooksCollectionName, query).then(() => {
      return Promise.resolve({});
    });
  }

  saveHook(hook) {
    var query;
    if (hook.functionName && hook.url) {
      query = { functionName: hook.functionName };
    } else if (hook.triggerName && hook.className && hook.url) {
      query = { className: hook.className, triggerName: hook.triggerName };
    } else {
      throw new Parse.Error(143, "invalid hook declaration");
    }
    return this.database.update(DefaultHooksCollectionName, query, hook, { upsert: true }).then(() => {
      return Promise.resolve(hook);
    });
  }

  addHookToTriggers(hook) {
    var wrappedFunction = wrapToHTTPRequest(hook, this._webhookKey);
    wrappedFunction.url = hook.url;
    if (hook.className) {
      triggers.addTrigger(hook.triggerName, hook.className, wrappedFunction, this._applicationId);
    } else {
      triggers.addFunction(hook.functionName, wrappedFunction, null, this._applicationId);
    }
  }

  addHook(hook) {
    this.addHookToTriggers(hook);
    return this.saveHook(hook);
  }

  createOrUpdateHook(aHook) {
    var hook;
    if (aHook && aHook.functionName && aHook.url) {
      hook = {};
      hook.functionName = aHook.functionName;
      hook.url = aHook.url;
    } else if (aHook && aHook.className && aHook.url && aHook.triggerName && triggers.Types[aHook.triggerName]) {
      hook = {};
      hook.className = aHook.className;
      hook.url = aHook.url;
      hook.triggerName = aHook.triggerName;
    } else {
      throw new Parse.Error(143, "invalid hook declaration");
    }

    return this.addHook(hook);
  }

  createHook(aHook) {
    if (aHook.functionName) {
      return this.getFunction(aHook.functionName).then(result => {
        if (result) {
          throw new Parse.Error(143, `function name: ${aHook.functionName} already exits`);
        } else {
          return this.createOrUpdateHook(aHook);
        }
      });
    } else if (aHook.className && aHook.triggerName) {
      return this.getTrigger(aHook.className, aHook.triggerName).then(result => {
        if (result) {
          throw new Parse.Error(143, `class ${aHook.className} already has trigger ${aHook.triggerName}`);
        }
        return this.createOrUpdateHook(aHook);
      });
    }

    throw new Parse.Error(143, "invalid hook declaration");
  }

  updateHook(aHook) {
    if (aHook.functionName) {
      return this.getFunction(aHook.functionName).then(result => {
        if (result) {
          return this.createOrUpdateHook(aHook);
        }
        throw new Parse.Error(143, `no function named: ${aHook.functionName} is defined`);
      });
    } else if (aHook.className && aHook.triggerName) {
      return this.getTrigger(aHook.className, aHook.triggerName).then(result => {
        if (result) {
          return this.createOrUpdateHook(aHook);
        }
        throw new Parse.Error(143, `class ${aHook.className} does not exist`);
      });
    }
    throw new Parse.Error(143, "invalid hook declaration");
  }
}

exports.HooksController = HooksController;
function wrapToHTTPRequest(hook, key) {
  return (req, res) => {
    const jsonBody = {};
    for (var i in req) {
      jsonBody[i] = req[i];
    }
    if (req.object) {
      jsonBody.object = req.object.toJSON();
      jsonBody.object.className = req.object.className;
    }
    if (req.original) {
      jsonBody.original = req.original.toJSON();
      jsonBody.original.className = req.original.className;
    }
    const jsonRequest = {
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(jsonBody)
    };

    const agent = hook.url.startsWith('https') ? HTTPAgents['https'] : HTTPAgents['http'];
    jsonRequest.agent = agent;

    if (key) {
      jsonRequest.headers['X-Parse-Webhook-Key'] = key;
    } else {
      _logger.logger.warn('Making outgoing webhook request without webhookKey being set!');
    }

    request.post(hook.url, jsonRequest, function (err, httpResponse, body) {
      var result;
      if (body) {
        if (typeof body === "string") {
          try {
            body = JSON.parse(body);
          } catch (e) {
            err = {
              error: "Malformed response",
              code: -1,
              partialResponse: body.substring(0, 100)
            };
          }
        }
        if (!err) {
          result = body.success;
          err = body.error;
        }
      }

      if (err) {
        return res.error(err);
      } else if (hook.triggerName === 'beforeSave') {
        if (typeof result === 'object') {
          delete result.createdAt;
          delete result.updatedAt;
        }
        return res.success({ object: result });
      } else {
        return res.success(result);
      }
    });
  };
}

exports.default = HooksController;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Db250cm9sbGVycy9Ib29rc0NvbnRyb2xsZXIuanMiXSwibmFtZXMiOlsidHJpZ2dlcnMiLCJQYXJzZSIsInJlcXVlc3QiLCJEZWZhdWx0SG9va3NDb2xsZWN0aW9uTmFtZSIsIkhUVFBBZ2VudHMiLCJodHRwIiwiQWdlbnQiLCJrZWVwQWxpdmUiLCJodHRwcyIsIkhvb2tzQ29udHJvbGxlciIsImNvbnN0cnVjdG9yIiwiYXBwbGljYXRpb25JZCIsImRhdGFiYXNlQ29udHJvbGxlciIsIndlYmhvb2tLZXkiLCJfYXBwbGljYXRpb25JZCIsIl93ZWJob29rS2V5IiwiZGF0YWJhc2UiLCJsb2FkIiwiX2dldEhvb2tzIiwidGhlbiIsImhvb2tzIiwiZm9yRWFjaCIsImhvb2siLCJhZGRIb29rVG9UcmlnZ2VycyIsImdldEZ1bmN0aW9uIiwiZnVuY3Rpb25OYW1lIiwicmVzdWx0cyIsImdldEZ1bmN0aW9ucyIsIiRleGlzdHMiLCJnZXRUcmlnZ2VyIiwiY2xhc3NOYW1lIiwidHJpZ2dlck5hbWUiLCJnZXRUcmlnZ2VycyIsImRlbGV0ZUZ1bmN0aW9uIiwicmVtb3ZlRnVuY3Rpb24iLCJfcmVtb3ZlSG9va3MiLCJkZWxldGVUcmlnZ2VyIiwicmVtb3ZlVHJpZ2dlciIsInF1ZXJ5IiwiZmluZCIsIm1hcCIsInJlc3VsdCIsIm9iamVjdElkIiwiZGVzdHJveSIsIlByb21pc2UiLCJyZXNvbHZlIiwic2F2ZUhvb2siLCJ1cmwiLCJFcnJvciIsInVwZGF0ZSIsInVwc2VydCIsIndyYXBwZWRGdW5jdGlvbiIsIndyYXBUb0hUVFBSZXF1ZXN0IiwiYWRkVHJpZ2dlciIsImFkZEZ1bmN0aW9uIiwiYWRkSG9vayIsImNyZWF0ZU9yVXBkYXRlSG9vayIsImFIb29rIiwiVHlwZXMiLCJjcmVhdGVIb29rIiwidXBkYXRlSG9vayIsImtleSIsInJlcSIsInJlcyIsImpzb25Cb2R5IiwiaSIsIm9iamVjdCIsInRvSlNPTiIsIm9yaWdpbmFsIiwianNvblJlcXVlc3QiLCJoZWFkZXJzIiwiYm9keSIsIkpTT04iLCJzdHJpbmdpZnkiLCJhZ2VudCIsInN0YXJ0c1dpdGgiLCJsb2dnZXIiLCJ3YXJuIiwicG9zdCIsImVyciIsImh0dHBSZXNwb25zZSIsInBhcnNlIiwiZSIsImVycm9yIiwiY29kZSIsInBhcnRpYWxSZXNwb25zZSIsInN1YnN0cmluZyIsInN1Y2Nlc3MiLCJjcmVhdGVkQXQiLCJ1cGRhdGVkQXQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFFQTs7SUFBWUEsUTs7QUFFWjs7SUFBWUMsSzs7QUFFWjs7SUFBWUMsTzs7QUFDWjs7QUFDQTs7OztBQUNBOzs7Ozs7OztBQUpBO0FBTEE7O0FBV0EsTUFBTUMsNkJBQTZCLFFBQW5DO0FBUkE7O0FBU0EsTUFBTUMsYUFBYTtBQUNqQkMsUUFBTSxJQUFJQSxlQUFLQyxLQUFULENBQWUsRUFBRUMsV0FBVyxJQUFiLEVBQWYsQ0FEVztBQUVqQkMsU0FBTyxJQUFJQSxnQkFBTUYsS0FBVixDQUFnQixFQUFFQyxXQUFXLElBQWIsRUFBaEI7QUFGVSxDQUFuQjs7QUFLTyxNQUFNRSxlQUFOLENBQXNCOztBQUszQkMsY0FBWUMsYUFBWixFQUFrQ0Msa0JBQWxDLEVBQXNEQyxVQUF0RCxFQUFrRTtBQUNoRSxTQUFLQyxjQUFMLEdBQXNCSCxhQUF0QjtBQUNBLFNBQUtJLFdBQUwsR0FBbUJGLFVBQW5CO0FBQ0EsU0FBS0csUUFBTCxHQUFnQkosa0JBQWhCO0FBQ0Q7O0FBRURLLFNBQU87QUFDTCxXQUFPLEtBQUtDLFNBQUwsR0FBaUJDLElBQWpCLENBQXNCQyxTQUFTO0FBQ3BDQSxjQUFRQSxTQUFTLEVBQWpCO0FBQ0FBLFlBQU1DLE9BQU4sQ0FBZUMsSUFBRCxJQUFVO0FBQ3RCLGFBQUtDLGlCQUFMLENBQXVCRCxJQUF2QjtBQUNELE9BRkQ7QUFHRCxLQUxNLENBQVA7QUFNRDs7QUFFREUsY0FBWUMsWUFBWixFQUEwQjtBQUN4QixXQUFPLEtBQUtQLFNBQUwsQ0FBZSxFQUFFTyxjQUFjQSxZQUFoQixFQUFmLEVBQStDTixJ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QixLQUFLZ0IsT0FBZDtBQUNBUixnQkFBTVIsS0FBS1ksS0FBWDtBQUNEO0FBQ0Y7O0FBRUQsVUFBSUosR0FBSixFQUFTO0FBQ1AsZUFBT2hCLElBQUlvQixLQUFKLENBQVVKLEdBQVYsQ0FBUDtBQUNELE9BRkQsTUFFTyxJQUFJekQsS0FBS1MsV0FBTCxLQUFxQixZQUF6QixFQUF1QztBQUM1QyxZQUFJLE9BQU9VLE1BQVAsS0FBa0IsUUFBdEIsRUFBZ0M7QUFDOUIsaUJBQU9BLE9BQU8rQyxTQUFkO0FBQ0EsaUJBQU8vQyxPQUFPZ0QsU0FBZDtBQUNEO0FBQ0QsZUFBTzFCLElBQUl3QixPQUFKLENBQVksRUFBQ3JCLFFBQVF6QixNQUFULEVBQVosQ0FBUDtBQUNELE9BTk0sTUFNQTtBQUNMLGVBQU9zQixJQUFJd0IsT0FBSixDQUFZOUMsTUFBWixDQUFQO0FBQ0Q7QUFDRixLQS9CRDtBQWdDRCxHQTdERDtBQThERDs7a0JBRWNoQyxlIiwiZmlsZSI6Ikhvb2tzQ29udHJvbGxlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKiBAZmxvdyB3ZWFrICovXG5cbmltcG9ydCAqIGFzIHRyaWdnZXJzICAgICAgICBmcm9tIFwiLi4vdHJpZ2dlcnNcIjtcbi8vIEBmbG93LWRpc2FibGUtbmV4dFxuaW1wb3J0ICogYXMgUGFyc2UgICAgICAgICAgIGZyb20gXCJwYXJzZS9ub2RlXCI7XG4vLyBAZmxvdy1kaXNhYmxlLW5leHRcbmltcG9ydCAqIGFzIHJlcXVlc3QgICAgICAgICBmcm9tIFwicmVxdWVzdFwiO1xuaW1wb3J0IHsgbG9nZ2VyIH0gICAgICAgICAgIGZyb20gJy4uL2xvZ2dlcic7XG5pbXBvcnQgaHR0cCAgICAgICAgICAgICAgICAgZnJvbSAnaHR0cCc7XG5pbXBvcnQgaHR0cHMgICAgICAgICAgICAgICAgZnJvbSAnaHR0cHMnO1xuXG5jb25zdCBEZWZhdWx0SG9va3NDb2xsZWN0aW9uTmFtZSA9IFwiX0hvb2tzXCI7XG5jb25zdCBIVFRQQWdlbnRzID0ge1xuICBodHRwOiBuZXcgaHR0cC5BZ2VudCh7IGtlZXBBbGl2ZTogdHJ1ZSB9KSxcbiAgaHR0cHM6IG5ldyBodHRwcy5BZ2VudCh7IGtlZXBBbGl2ZTogdHJ1ZSB9KSxcbn1cblxuZXhwb3J0IGNsYXNzIEhvb2tzQ29udHJvbGxlciB7XG4gIF9hcHBsaWNhdGlvbklkOnN0cmluZztcbiAgX3dlYmhvb2tLZXk6c3RyaW5nO1xuICBkYXRhYmFzZTogYW55O1xuXG4gIGNvbnN0cnVjdG9yKGFwcGxpY2F0aW9uSWQ6c3RyaW5nLCBkYXRhYmFzZUNvbnRyb2xsZXIsIHdlYmhvb2tLZXkpIHtcbiAgICB0aGlzLl9hcHBsaWNhdGlvbklkID0gYXBwbGljYXRpb25JZDtcbiAgICB0aGlzLl93ZWJob29rS2V5ID0gd2ViaG9va0tleTtcbiAgICB0aGlzLmRhdGFiYXNlID0gZGF0YWJhc2VDb250cm9sbGVyO1xuICB9XG5cbiAgbG9hZCgpIHtcbiAgICByZXR1cm4gdGhpcy5fZ2V0SG9va3MoKS50aGVuKGhvb2tzID0+IHtcbiAgICAgIGhvb2tzID0gaG9va3MgfHwgW107XG4gICAgICBob29rcy5mb3JFYWNoKChob29rKSA9PiB7XG4gICAgICAgIHRoaXMuYWRkSG9va1RvVHJpZ2dlcnMoaG9vayk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGdldEZ1bmN0aW9uKGZ1bmN0aW9uTmFtZSkge1xuICAgIHJldHVybiB0aGlzLl9nZXRIb29rcyh7IGZ1bmN0aW9uTmFtZTogZnVuY3Rpb25OYW1lIH0pLnRoZW4ocmVzdWx0cyA9PiByZXN1bHRzWzBdKTtcbiAgfVxuXG4gIGdldEZ1bmN0aW9ucygpIHtcbiAgICByZXR1cm4gdGhpcy5fZ2V0SG9va3MoeyBmdW5jdGlvbk5hbWU6IHsgJGV4aXN0czogdHJ1ZSB9IH0pO1xuICB9XG5cbiAgZ2V0VHJpZ2dlcihjbGFzc05hbWUsIHRyaWdnZXJOYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMuX2dldEhvb2tzKHsgY2xhc3NOYW1lOiBjbGFzc05hbWUsIHRyaWdnZXJOYW1lOiB0cmlnZ2VyTmFtZSB9KS50aGVuKHJlc3VsdHMgPT4gcmVzdWx0c1swXSk7XG4gIH1cblxuICBnZXRUcmlnZ2VycygpIHtcbiAgICByZXR1cm4gdGhpcy5fZ2V0SG9va3MoeyBjbGFzc05hbWU6IHsgJGV4aXN0czogdHJ1ZSB9LCB0cmlnZ2VyTmFtZTogeyAkZXhpc3RzOiB0cnVlIH0gfSk7XG4gIH1cblxuICBkZWxldGVGdW5jdGlvbihmdW5jdGlvbk5hbWUpIHtcbiAgICB0cmlnZ2Vycy5yZW1vdmVGdW5jdGlvbihmdW5jdGlvbk5hbWUsIHRoaXMuX2FwcGxpY2F0aW9uSWQpO1xuICAgIHJldHVybiB0aGlzLl9yZW1vdmVIb29rcyh7IGZ1bmN0aW9uTmFtZTogZnVuY3Rpb25OYW1lIH0pO1xuICB9XG5cbiAgZGVsZXRlVHJpZ2dlcihjbGFzc05hbWUsIHRyaWdnZXJOYW1lKSB7XG4gICAgdHJpZ2dlcnMucmVtb3ZlVHJpZ2dlcih0cmlnZ2VyTmFtZSwgY2xhc3NOYW1lLCB0aGlzLl9hcHBsaWNhdGlvbklkKTtcbiAgICByZXR1cm4gdGhpcy5fcmVtb3ZlSG9va3MoeyBjbGFzc05hbWU6IGNsYXNzTmFtZSwgdHJpZ2dlck5hbWU6IHRyaWdnZXJOYW1lIH0pO1xuICB9XG5cbiAgX2dldEhvb2tzKHF1ZXJ5ID0ge30pIHtcbiAgICByZXR1cm4gdGhpcy5kYXRhYmFzZS5maW5kKERlZmF1bHRIb29rc0NvbGxlY3Rpb25OYW1lLCBxdWVyeSkudGhlbigocmVzdWx0cykgPT4ge1xuICAgICAgcmV0dXJuIHJlc3VsdHMubWFwKChyZXN1bHQpID0+IHtcbiAgICAgICAgZGVsZXRlIHJlc3VsdC5vYmplY3RJZDtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgX3JlbW92ZUhvb2tzKHF1ZXJ5KSB7XG4gICAgcmV0dXJuIHRoaXMuZGF0YWJhc2UuZGVzdHJveShEZWZhdWx0SG9va3NDb2xsZWN0aW9uTmFtZSwgcXVlcnkpLnRoZW4oKCkgPT4ge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh7fSk7XG4gICAgfSk7XG4gIH1cblxuICBzYXZlSG9vayhob29rKSB7XG4gICAgdmFyIHF1ZXJ5O1xuICAgIGlmIChob29rLmZ1bmN0aW9uTmFtZSAmJiBob29rLnVybCkge1xuICAgICAgcXVlcnkgPSB7IGZ1bmN0aW9uTmFtZTogaG9vay5mdW5jdGlvbk5hbWUgfVxuICAgIH0gZWxzZSBpZiAoaG9vay50cmlnZ2VyTmFtZSAmJiBob29rLmNsYXNzTmFtZSAmJiBob29rLnVybCkge1xuICAgICAgcXVlcnkgPSB7IGNsYXNzTmFtZTogaG9vay5jbGFzc05hbWUsIHRyaWdnZXJOYW1lOiBob29rLnRyaWdnZXJOYW1lIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IFBhcnNlLkVycm9yKDE0MywgXCJpbnZhbGlkIGhvb2sgZGVjbGFyYXRpb25cIik7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmRhdGFiYXNlLnVwZGF0ZShEZWZhdWx0SG9va3NDb2xsZWN0aW9uTmFtZSwgcXVlcnksIGhvb2ssIHt1cHNlcnQ6IHRydWV9KS50aGVuKCgpID0+IHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoaG9vayk7XG4gICAgfSlcbiAgfVxuXG4gIGFkZEhvb2tUb1RyaWdnZXJzKGhvb2spIHtcbiAgICB2YXIgd3JhcHBlZEZ1bmN0aW9uID0gd3JhcFRvSFRUUFJlcXVlc3QoaG9vaywgdGhpcy5fd2ViaG9va0tleSk7XG4gICAgd3JhcHBlZEZ1bmN0aW9uLnVybCA9IGhvb2sudXJsO1xuICAgIGlmIChob29rLmNsYXNzTmFtZSkge1xuICAgICAgdHJpZ2dlcnMuYWRkVHJpZ2dlcihob29rLnRyaWdnZXJOYW1lLCBob29rLmNsYXNzTmFtZSwgd3JhcHBlZEZ1bmN0aW9uLCB0aGlzLl9hcHBsaWNhdGlvbklkKVxuICAgIH0gZWxzZSB7XG4gICAgICB0cmlnZ2Vycy5hZGRGdW5jdGlvbihob29rLmZ1bmN0aW9uTmFtZSwgd3JhcHBlZEZ1bmN0aW9uLCBudWxsLCB0aGlzLl9hcHBsaWNhdGlvbklkKTtcbiAgICB9XG4gIH1cblxuICBhZGRIb29rKGhvb2spIHtcbiAgICB0aGlzLmFkZEhvb2tUb1RyaWdnZXJzKGhvb2spO1xuICAgIHJldHVybiB0aGlzLnNhdmVIb29rKGhvb2spO1xuICB9XG5cbiAgY3JlYXRlT3JVcGRhdGVIb29rKGFIb29rKSB7XG4gICAgdmFyIGhvb2s7XG4gICAgaWYgKGFIb29rICYmIGFIb29rLmZ1bmN0aW9uTmFtZSAmJiBhSG9vay51cmwpIHtcbiAgICAgIGhvb2sgPSB7fTtcbiAgICAgIGhvb2suZnVuY3Rpb25OYW1lID0gYUhvb2suZnVuY3Rpb25OYW1lO1xuICAgICAgaG9vay51cmwgPSBhSG9vay51cmw7XG4gICAgfSBlbHNlIGlmIChhSG9vayAmJiBhSG9vay5jbGFzc05hbWUgJiYgYUhvb2sudXJsICYmIGFIb29rLnRyaWdnZXJOYW1lICYmIHRyaWdnZXJzLlR5cGVzW2FIb29rLnRyaWdnZXJOYW1lXSkge1xuICAgICAgaG9vayA9IHt9O1xuICAgICAgaG9vay5jbGFzc05hbWUgPSBhSG9vay5jbGFzc05hbWU7XG4gICAgICBob29rLnVybCA9IGFIb29rLnVybDtcbiAgICAgIGhvb2sudHJpZ2dlck5hbWUgPSBhSG9vay50cmlnZ2VyTmFtZTtcblxuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgUGFyc2UuRXJyb3IoMTQzLCBcImludmFsaWQgaG9vayBkZWNsYXJhdGlvblwiKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5hZGRIb29rKGhvb2spO1xuICB9XG5cbiAgY3JlYXRlSG9vayhhSG9vaykge1xuICAgIGlmIChhSG9vay5mdW5jdGlvbk5hbWUpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldEZ1bmN0aW9uKGFIb29rLmZ1bmN0aW9uTmFtZSkudGhlbigocmVzdWx0KSA9PiB7XG4gICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgUGFyc2UuRXJyb3IoMTQzLCBgZnVuY3Rpb24gbmFtZTogJHthSG9vay5mdW5jdGlvbk5hbWV9IGFscmVhZHkgZXhpdHNgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5jcmVhdGVPclVwZGF0ZUhvb2soYUhvb2spO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKGFIb29rLmNsYXNzTmFtZSAmJiBhSG9vay50cmlnZ2VyTmFtZSkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0VHJpZ2dlcihhSG9vay5jbGFzc05hbWUsIGFIb29rLnRyaWdnZXJOYW1lKS50aGVuKChyZXN1bHQpID0+IHtcbiAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgIHRocm93IG5ldyBQYXJzZS5FcnJvcigxNDMsIGBjbGFzcyAke2FIb29rLmNsYXNzTmFtZX0gYWxyZWFkeSBoYXMgdHJpZ2dlciAke2FIb29rLnRyaWdnZXJOYW1lfWApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmNyZWF0ZU9yVXBkYXRlSG9vayhhSG9vayk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICB0aHJvdyBuZXcgUGFyc2UuRXJyb3IoMTQzLCBcImludmFsaWQgaG9vayBkZWNsYXJhdGlvblwiKTtcbiAgfVxuXG4gIHVwZGF0ZUhvb2soYUhvb2spIHtcbiAgICBpZiAoYUhvb2suZnVuY3Rpb25OYW1lKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRGdW5jdGlvbihhSG9vay5mdW5jdGlvbk5hbWUpLnRoZW4oKHJlc3VsdCkgPT4ge1xuICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuY3JlYXRlT3JVcGRhdGVIb29rKGFIb29rKTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgUGFyc2UuRXJyb3IoMTQzLCBgbm8gZnVuY3Rpb24gbmFtZWQ6ICR7YUhvb2suZnVuY3Rpb25OYW1lfSBpcyBkZWZpbmVkYCk7XG4gICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKGFIb29rLmNsYXNzTmFtZSAmJiBhSG9vay50cmlnZ2VyTmFtZSkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0VHJpZ2dlcihhSG9vay5jbGFzc05hbWUsIGFIb29rLnRyaWdnZXJOYW1lKS50aGVuKChyZXN1bHQpID0+IHtcbiAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgIHJldHVybiB0aGlzLmNyZWF0ZU9yVXBkYXRlSG9vayhhSG9vayk7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgbmV3IFBhcnNlLkVycm9yKDE0MywgYGNsYXNzICR7YUhvb2suY2xhc3NOYW1lfSBkb2VzIG5vdCBleGlzdGApO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHRocm93IG5ldyBQYXJzZS5FcnJvcigxNDMsIFwiaW52YWxpZCBob29rIGRlY2xhcmF0aW9uXCIpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHdyYXBUb0hUVFBSZXF1ZXN0KGhvb2ssIGtleSkge1xuICByZXR1cm4gKHJlcSwgcmVzKSA9PiB7XG4gICAgY29uc3QganNvbkJvZHkgPSB7fTtcbiAgICBmb3IgKHZhciBpIGluIHJlcSkge1xuICAgICAganNvbkJvZHlbaV0gPSByZXFbaV07XG4gICAgfVxuICAgIGlmIChyZXEub2JqZWN0KSB7XG4gICAgICBqc29uQm9keS5vYmplY3QgPSByZXEub2JqZWN0LnRvSlNPTigpO1xuICAgICAganNvbkJvZHkub2JqZWN0LmNsYXNzTmFtZSA9IHJlcS5vYmplY3QuY2xhc3NOYW1lO1xuICAgIH1cbiAgICBpZiAocmVxLm9yaWdpbmFsKSB7XG4gICAgICBqc29uQm9keS5vcmlnaW5hbCA9IHJlcS5vcmlnaW5hbC50b0pTT04oKTtcbiAgICAgIGpzb25Cb2R5Lm9yaWdpbmFsLmNsYXNzTmFtZSA9IHJlcS5vcmlnaW5hbC5jbGFzc05hbWU7XG4gICAgfVxuICAgIGNvbnN0IGpzb25SZXF1ZXN0OiBhbnkgPSB7XG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbidcbiAgICAgIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShqc29uQm9keSksXG4gICAgfTtcblxuICAgIGNvbnN0IGFnZW50ID0gaG9vay51cmwuc3RhcnRzV2l0aCgnaHR0cHMnKSA/IEhUVFBBZ2VudHNbJ2h0dHBzJ10gOiBIVFRQQWdlbnRzWydodHRwJ107XG4gICAganNvblJlcXVlc3QuYWdlbnQgPSBhZ2VudDtcblxuICAgIGlmIChrZXkpIHtcbiAgICAgIGpzb25SZXF1ZXN0LmhlYWRlcnNbJ1gtUGFyc2UtV2ViaG9vay1LZXknXSA9IGtleTtcbiAgICB9IGVsc2Uge1xuICAgICAgbG9nZ2VyLndhcm4oJ01ha2luZyBvdXRnb2luZyB3ZWJob29rIHJlcXVlc3Qgd2l0aG91dCB3ZWJob29rS2V5IGJlaW5nIHNldCEnKTtcbiAgICB9XG5cbiAgICByZXF1ZXN0LnBvc3QoaG9vay51cmwsIGpzb25SZXF1ZXN0LCBmdW5jdGlvbiAoZXJyLCBodHRwUmVzcG9uc2UsIGJvZHkpIHtcbiAgICAgIHZhciByZXN1bHQ7XG4gICAgICBpZiAoYm9keSkge1xuICAgICAgICBpZiAodHlwZW9mIGJvZHkgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgYm9keSA9IEpTT04ucGFyc2UoYm9keSk7XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgZXJyID0ge1xuICAgICAgICAgICAgICBlcnJvcjogXCJNYWxmb3JtZWQgcmVzcG9uc2VcIixcbiAgICAgICAgICAgICAgY29kZTogLTEsXG4gICAgICAgICAgICAgIHBhcnRpYWxSZXNwb25zZTogYm9keS5zdWJzdHJpbmcoMCwgMTAwKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFlcnIpIHtcbiAgICAgICAgICByZXN1bHQgPSBib2R5LnN1Y2Nlc3M7XG4gICAgICAgICAgZXJyID0gYm9keS5lcnJvcjtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIHJldHVybiByZXMuZXJyb3IoZXJyKTtcbiAgICAgIH0gZWxzZSBpZiAoaG9vay50cmlnZ2VyTmFtZSA9PT0gJ2JlZm9yZVNhdmUnKSB7XG4gICAgICAgIGlmICh0eXBlb2YgcmVzdWx0ID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgIGRlbGV0ZSByZXN1bHQuY3JlYXRlZEF0O1xuICAgICAgICAgIGRlbGV0ZSByZXN1bHQudXBkYXRlZEF0O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXMuc3VjY2Vzcyh7b2JqZWN0OiByZXN1bHR9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiByZXMuc3VjY2VzcyhyZXN1bHQpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEhvb2tzQ29udHJvbGxlcjtcbiJdfQ==