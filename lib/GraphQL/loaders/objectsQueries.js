"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.load = exports.findObjects = exports.getObject = void 0;

var _graphql = require("graphql");

var _graphqlListFields = _interopRequireDefault(require("graphql-list-fields"));

var _node = _interopRequireDefault(require("parse/node"));

var defaultGraphQLTypes = _interopRequireWildcard(require("./defaultGraphQLTypes"));

var _rest = _interopRequireDefault(require("../../rest"));

var _query = require("../transformers/query");

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const getObject = async (className, objectId, keys, include, readPreference, includeReadPreference, config, auth, info) => {
  const options = {};

  if (keys) {
    options.keys = keys;
  }

  if (include) {
    options.include = include;

    if (includeReadPreference) {
      options.includeReadPreference = includeReadPreference;
    }
  }

  if (readPreference) {
    options.readPreference = readPreference;
  }

  const response = await _rest.default.get(config, auth, className, objectId, options, info.clientSDK);

  if (!response.results || response.results.length == 0) {
    throw new _node.default.Error(_node.default.Error.OBJECT_NOT_FOUND, 'Object not found.');
  }

  if (className === '_User') {
    delete response.results[0].sessionToken;
  }

  return response.results[0];
};

exports.getObject = getObject;

const findObjects = async (className, where, order, skip, limit, keys, include, includeAll, readPreference, includeReadPreference, subqueryReadPreference, config, auth, info, selectedFields) => {
  if (!where) {
    where = {};
  }

  (0, _query.transformQueryInputToParse)(where);
  const options = {};

  if (selectedFields.includes('results')) {
    if (limit || limit === 0) {
      options.limit = limit;
    }

    if (options.limit !== 0) {
      if (order) {
        options.order = order;
      }

      if (skip) {
        options.skip = skip;
      }

      if (config.maxLimit && options.limit > config.maxLimit) {
        // Silently replace the limit on the query with the max configured
        options.limit = config.maxLimit;
      }

      if (keys) {
        options.keys = keys;
      }

      if (includeAll === true) {
        options.includeAll = includeAll;
      }

      if (!options.includeAll && include) {
        options.include = include;
      }

      if ((options.includeAll || options.include) && includeReadPreference) {
        options.includeReadPreference = includeReadPreference;
      }
    }
  } else {
    options.limit = 0;
  }

  if (selectedFields.includes('count')) {
    options.count = true;
  }

  if (readPreference) {
    options.readPreference = readPreference;
  }

  if (Object.keys(where).length > 0 && subqueryReadPreference) {
    options.subqueryReadPreference = subqueryReadPreference;
  }

  return await _rest.default.find(config, auth, className, where, options, info.clientSDK);
};

exports.findObjects = findObjects;

const load = parseGraphQLSchema => {
  parseGraphQLSchema.addGraphQLQuery('get', {
    description: 'The get query can be used to get an object of a certain class by its objectId.',
    args: {
      className: defaultGraphQLTypes.CLASS_NAME_ATT,
      objectId: defaultGraphQLTypes.OBJECT_ID_ATT,
      keys: defaultGraphQLTypes.KEYS_ATT,
      include: defaultGraphQLTypes.INCLUDE_ATT,
      readPreference: defaultGraphQLTypes.READ_PREFERENCE_ATT,
      includeReadPreference: defaultGraphQLTypes.INCLUDE_READ_PREFERENCE_ATT
    },
    type: new _graphql.GraphQLNonNull(defaultGraphQLTypes.OBJECT),

    async resolve(_source, args, context) {
      try {
        const {
          className,
          objectId,
          keys,
          include,
          readPreference,
          includeReadPreference
        } = args;
        const {
          config,
          auth,
          info
        } = context;
        return await getObject(className, objectId, keys, include, readPreference, includeReadPreference, config, auth, info);
      } catch (e) {
        parseGraphQLSchema.handleError(e);
      }
    }

  }, true, true);
  parseGraphQLSchema.addGraphQLQuery('find', {
    description: 'The find query can be used to find objects of a certain class.',
    args: {
      className: defaultGraphQLTypes.CLASS_NAME_ATT,
      where: defaultGraphQLTypes.WHERE_ATT,
      order: {
        description: 'This is the order in which the objects should be returned',
        type: _graphql.GraphQLString
      },
      skip: defaultGraphQLTypes.SKIP_ATT,
      limit: defaultGraphQLTypes.LIMIT_ATT,
      keys: defaultGraphQLTypes.KEYS_ATT,
      include: defaultGraphQLTypes.INCLUDE_ATT,
      includeAll: {
        description: 'All pointers will be returned',
        type: _graphql.GraphQLBoolean
      },
      readPreference: defaultGraphQLTypes.READ_PREFERENCE_ATT,
      includeReadPreference: defaultGraphQLTypes.INCLUDE_READ_PREFERENCE_ATT,
      subqueryReadPreference: defaultGraphQLTypes.SUBQUERY_READ_PREFERENCE_ATT
    },
    type: new _graphql.GraphQLNonNull(defaultGraphQLTypes.FIND_RESULT),

    async resolve(_source, args, context, queryInfo) {
      try {
        const {
          className,
          where,
          order,
          skip,
          limit,
          keys,
          include,
          includeAll,
          readPreference,
          includeReadPreference,
          subqueryReadPreference
        } = args;
        const {
          config,
          auth,
          info
        } = context;
        const selectedFields = (0, _graphqlListFields.default)(queryInfo);
        return await findObjects(className, where, order, skip, limit, keys, include, includeAll, readPreference, includeReadPreference, subqueryReadPreference, config, auth, info, selectedFields);
      } catch (e) {
        parseGraphQLSchema.handleError(e);
      }
    }

  }, true, true);
};

exports.load = load;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9HcmFwaFFML2xvYWRlcnMvb2JqZWN0c1F1ZXJpZXMuanMiXSwibmFtZXMiOlsiZ2V0T2JqZWN0IiwiY2xhc3NOYW1lIiwib2JqZWN0SWQiLCJrZXlzIiwiaW5jbHVkZSIsInJlYWRQcmVmZXJlbmNlIiwiaW5jbHVkZVJlYWRQcmVmZXJlbmNlIiwiY29uZmlnIiwiYXV0aCIsImluZm8iLCJvcHRpb25zIiwicmVzcG9uc2UiLCJyZXN0IiwiZ2V0IiwiY2xpZW50U0RLIiwicmVzdWx0cyIsImxlbmd0aCIsIlBhcnNlIiwiRXJyb3IiLCJPQkpFQ1RfTk9UX0ZPVU5EIiwic2Vzc2lvblRva2VuIiwiZmluZE9iamVjdHMiLCJ3aGVyZSIsIm9yZGVyIiwic2tpcCIsImxpbWl0IiwiaW5jbHVkZUFsbCIsInN1YnF1ZXJ5UmVhZFByZWZlcmVuY2UiLCJzZWxlY3RlZEZpZWxkcyIsImluY2x1ZGVzIiwibWF4TGltaXQiLCJjb3VudCIsIk9iamVjdCIsImZpbmQiLCJsb2FkIiwicGFyc2VHcmFwaFFMU2NoZW1hIiwiYWRkR3JhcGhRTFF1ZXJ5IiwiZGVzY3JpcHRpb24iLCJhcmdzIiwiZGVmYXVsdEdyYXBoUUxUeXBlcyIsIkNMQVNTX05BTUVfQVRUIiwiT0JKRUNUX0lEX0FUVCIsIktFWVNfQVRUIiwiSU5DTFVERV9BVFQiLCJSRUFEX1BSRUZFUkVOQ0VfQVRUIiwiSU5DTFVERV9SRUFEX1BSRUZFUkVOQ0VfQVRUIiwidHlwZSIsIkdyYXBoUUxOb25OdWxsIiwiT0JKRUNUIiwicmVzb2x2ZSIsIl9zb3VyY2UiLCJjb250ZXh0IiwiZSIsImhhbmRsZUVycm9yIiwiV0hFUkVfQVRUIiwiR3JhcGhRTFN0cmluZyIsIlNLSVBfQVRUIiwiTElNSVRfQVRUIiwiR3JhcGhRTEJvb2xlYW4iLCJTVUJRVUVSWV9SRUFEX1BSRUZFUkVOQ0VfQVRUIiwiRklORF9SRVNVTFQiLCJxdWVyeUluZm8iXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFBQTs7QUFDQTs7QUFD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STtBQUVKcUIsVUFBQUEsS0FGSTtBQUdKQyxVQUFBQSxLQUhJO0FBSUpDLFVBQUFBLElBSkk7QUFLSkMsVUFBQUEsS0FMSTtBQU1KdEIsVUFBQUEsSUFOSTtBQU9KQyxVQUFBQSxPQVBJO0FBUUpzQixVQUFBQSxVQVJJO0FBU0pyQixVQUFBQSxjQVRJO0FBVUpDLFVBQUFBLHFCQVZJO0FBV0pxQixVQUFBQTtBQVhJLFlBWUZXLElBWko7QUFjQSxjQUFNO0FBQUUvQixVQUFBQSxNQUFGO0FBQVVDLFVBQUFBLElBQVY7QUFBZ0JDLFVBQUFBO0FBQWhCLFlBQXlCMEMsT0FBL0I7QUFDQSxjQUFNdkIsY0FBYyxHQUFHLGdDQUFjaUMsU0FBZCxDQUF2QjtBQUVBLGVBQU8sTUFBTXhDLFdBQVcsQ0FDdEJwQixTQURzQixFQUV0QnFCLEtBRnNCLEVBR3RCQyxLQUhzQixFQUl0QkMsSUFKc0IsRUFLdEJDLEtBTHNCLEVBTXRCdEIsSUFOc0IsRUFPdEJDLE9BUHNCLEVBUXRCc0IsVUFSc0IsRUFTdEJyQixjQVRzQixFQVV0QkMscUJBVnNCLEVBV3RCcUIsc0JBWHNCLEVBWXRCcEIsTUFac0IsRUFhdEJDLElBYnNCLEVBY3RCQyxJQWRzQixFQWV0Qm1CLGNBZnNCLENBQXhCO0FBaUJELE9BbkNELENBbUNFLE9BQU93QixDQUFQLEVBQVU7QUFDVmpCLFFBQUFBLGtCQUFrQixDQUFDa0IsV0FBbkIsQ0FBK0JELENBQS9CO0FBQ0Q7QUFDRjs7QUFoRUgsR0FGRixFQW9FRSxJQXBFRixFQXFFRSxJQXJFRjtBQXVFRCxDQXZIRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEdyYXBoUUxOb25OdWxsLCBHcmFwaFFMQm9vbGVhbiwgR3JhcGhRTFN0cmluZyB9IGZyb20gJ2dyYXBocWwnO1xuaW1wb3J0IGdldEZpZWxkTmFtZXMgZnJvbSAnZ3JhcGhxbC1saXN0LWZpZWxkcyc7XG5pbXBvcnQgUGFyc2UgZnJvbSAncGFyc2Uvbm9kZSc7XG5pbXBvcnQgKiBhcyBkZWZhdWx0R3JhcGhRTFR5cGVzIGZyb20gJy4vZGVmYXVsdEdyYXBoUUxUeXBlcyc7XG5pbXBvcnQgcmVzdCBmcm9tICcuLi8uLi9yZXN0JztcbmltcG9ydCB7IHRyYW5zZm9ybVF1ZXJ5SW5wdXRUb1BhcnNlIH0gZnJvbSAnLi4vdHJhbnNmb3JtZXJzL3F1ZXJ5JztcblxuY29uc3QgZ2V0T2JqZWN0ID0gYXN5bmMgKFxuICBjbGFzc05hbWUsXG4gIG9iamVjdElkLFxuICBrZXlzLFxuICBpbmNsdWRlLFxuICByZWFkUHJlZmVyZW5jZSxcbiAgaW5jbHVkZVJlYWRQcmVmZXJlbmNlLFxuICBjb25maWcsXG4gIGF1dGgsXG4gIGluZm9cbikgPT4ge1xuICBjb25zdCBvcHRpb25zID0ge307XG4gIGlmIChrZXlzKSB7XG4gICAgb3B0aW9ucy5rZXlzID0ga2V5cztcbiAgfVxuICBpZiAoaW5jbHVkZSkge1xuICAgIG9wdGlvbnMuaW5jbHVkZSA9IGluY2x1ZGU7XG4gICAgaWYgKGluY2x1ZGVSZWFkUHJlZmVyZW5jZSkge1xuICAgICAgb3B0aW9ucy5pbmNsdWRlUmVhZFByZWZlcmVuY2UgPSBpbmNsdWRlUmVhZFByZWZlcmVuY2U7XG4gICAgfVxuICB9XG4gIGlmIChyZWFkUHJlZmVyZW5jZSkge1xuICAgIG9wdGlvbnMucmVhZFByZWZlcmVuY2UgPSByZWFkUHJlZmVyZW5jZTtcbiAgfVxuXG4gIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVzdC5nZXQoXG4gICAgY29uZmlnLFxuICAgIGF1dGgsXG4gICAgY2xhc3NOYW1lLFxuICAgIG9iamVjdElkLFxuICAgIG9wdGlvbnMsXG4gICAgaW5mby5jbGllbnRTREtcbiAgKTtcblxuICBpZiAoIXJlc3BvbnNlLnJlc3VsdHMgfHwgcmVzcG9uc2UucmVzdWx0cy5sZW5ndGggPT0gMCkge1xuICAgIHRocm93IG5ldyBQYXJzZS5FcnJvcihQYXJzZS5FcnJvci5PQkpFQ1RfTk9UX0ZPVU5ELCAnT2JqZWN0IG5vdCBmb3VuZC4nKTtcbiAgfVxuXG4gIGlmIChjbGFzc05hbWUgPT09ICdfVXNlcicpIHtcbiAgICBkZWxldGUgcmVzcG9uc2UucmVzdWx0c1swXS5zZXNzaW9uVG9rZW47XG4gIH1cblxuICByZXR1cm4gcmVzcG9uc2UucmVzdWx0c1swXTtcbn07XG5cbmNvbnN0IGZpbmRPYmplY3RzID0gYXN5bmMgKFxuICBjbGFzc05hbWUsXG4gIHdoZXJlLFxuICBvcmRlcixcbiAgc2tpcCxcbiAgbGltaXQsXG4gIGtleXMsXG4gIGluY2x1ZGUsXG4gIGluY2x1ZGVBbGwsXG4gIHJlYWRQcmVmZXJlbmNlLFxuICBpbmNsdWRlUmVhZFByZWZlcmVuY2UsXG4gIHN1YnF1ZXJ5UmVhZFByZWZlcmVuY2UsXG4gIGNvbmZpZyxcbiAgYXV0aCxcbiAgaW5mbyxcbiAgc2VsZWN0ZWRGaWVsZHNcbikgPT4ge1xuICBpZiAoIXdoZXJlKSB7XG4gICAgd2hlcmUgPSB7fTtcbiAgfVxuXG4gIHRyYW5zZm9ybVF1ZXJ5SW5wdXRUb1BhcnNlKHdoZXJlKTtcblxuICBjb25zdCBvcHRpb25zID0ge307XG5cbiAgaWYgKHNlbGVjdGVkRmllbGRzLmluY2x1ZGVzKCdyZXN1bHRzJykpIHtcbiAgICBpZiAobGltaXQgfHwgbGltaXQgPT09IDApIHtcbiAgICAgIG9wdGlvbnMubGltaXQgPSBsaW1pdDtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMubGltaXQgIT09IDApIHtcbiAgICAgIGlmIChvcmRlcikge1xuICAgICAgICBvcHRpb25zLm9yZGVyID0gb3JkZXI7XG4gICAgICB9XG4gICAgICBpZiAoc2tpcCkge1xuICAgICAgICBvcHRpb25zLnNraXAgPSBza2lwO1xuICAgICAgfVxuICAgICAgaWYgKGNvbmZpZy5tYXhMaW1pdCAmJiBvcHRpb25zLmxpbWl0ID4gY29uZmlnLm1heExpbWl0KSB7XG4gICAgICAgIC8vIFNpbGVudGx5IHJlcGxhY2UgdGhlIGxpbWl0IG9uIHRoZSBxdWVyeSB3aXRoIHRoZSBtYXggY29uZmlndXJlZFxuICAgICAgICBvcHRpb25zLmxpbWl0ID0gY29uZmlnLm1heExpbWl0O1xuICAgICAgfVxuICAgICAgaWYgKGtleXMpIHtcbiAgICAgICAgb3B0aW9ucy5rZXlzID0ga2V5cztcbiAgICAgIH1cbiAgICAgIGlmIChpbmNsdWRlQWxsID09PSB0cnVlKSB7XG4gICAgICAgIG9wdGlvbnMuaW5jbHVkZUFsbCA9IGluY2x1ZGVBbGw7XG4gICAgICB9XG4gICAgICBpZiAoIW9wdGlvbnMuaW5jbHVkZUFsbCAmJiBpbmNsdWRlKSB7XG4gICAgICAgIG9wdGlvbnMuaW5jbHVkZSA9IGluY2x1ZGU7XG4gICAgICB9XG4gICAgICBpZiAoKG9wdGlvbnMuaW5jbHVkZUFsbCB8fCBvcHRpb25zLmluY2x1ZGUpICYmIGluY2x1ZGVSZWFkUHJlZmVyZW5jZSkge1xuICAgICAgICBvcHRpb25zLmluY2x1ZGVSZWFkUHJlZmVyZW5jZSA9IGluY2x1ZGVSZWFkUHJlZmVyZW5jZTtcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgb3B0aW9ucy5saW1pdCA9IDA7XG4gIH1cblxuICBpZiAoc2VsZWN0ZWRGaWVsZHMuaW5jbHVkZXMoJ2NvdW50JykpIHtcbiAgICBvcHRpb25zLmNvdW50ID0gdHJ1ZTtcbiAgfVxuXG4gIGlmIChyZWFkUHJlZmVyZW5jZSkge1xuICAgIG9wdGlvbnMucmVhZFByZWZlcmVuY2UgPSByZWFkUHJlZmVyZW5jZTtcbiAgfVxuICBpZiAoT2JqZWN0LmtleXMod2hlcmUpLmxlbmd0aCA+IDAgJiYgc3VicXVlcnlSZWFkUHJlZmVyZW5jZSkge1xuICAgIG9wdGlvbnMuc3VicXVlcnlSZWFkUHJlZmVyZW5jZSA9IHN1YnF1ZXJ5UmVhZFByZWZlcmVuY2U7XG4gIH1cblxuICByZXR1cm4gYXdhaXQgcmVzdC5maW5kKFxuICAgIGNvbmZpZyxcbiAgICBhdXRoLFxuICAgIGNsYXNzTmFtZSxcbiAgICB3aGVyZSxcbiAgICBvcHRpb25zLFxuICAgIGluZm8uY2xpZW50U0RLXG4gICk7XG59O1xuXG5jb25zdCBsb2FkID0gcGFyc2VHcmFwaFFMU2NoZW1hID0+IHtcbiAgcGFyc2VHcmFwaFFMU2NoZW1hLmFkZEdyYXBoUUxRdWVyeShcbiAgICAnZ2V0JyxcbiAgICB7XG4gICAgICBkZXNjcmlwdGlvbjpcbiAgICAgICAgJ1RoZSBnZXQgcXVlcnkgY2FuIGJlIHVzZWQgdG8gZ2V0IGFuIG9iamVjdCBvZiBhIGNlcnRhaW4gY2xhc3MgYnkgaXRzIG9iamVjdElkLicsXG4gICAgICBhcmdzOiB7XG4gICAgICAgIGNsYXNzTmFtZTogZGVmYXVsdEdyYXBoUUxUeXBlcy5DTEFTU19OQU1FX0FUVCxcbiAgICAgICAgb2JqZWN0SWQ6IGRlZmF1bHRHcmFwaFFMVHlwZXMuT0JKRUNUX0lEX0FUVCxcbiAgICAgICAga2V5czogZGVmYXVsdEdyYXBoUUxUeXBlcy5LRVlTX0FUVCxcbiAgICAgICAgaW5jbHVkZTogZGVmYXVsdEdyYXBoUUxUeXBlcy5JTkNMVURFX0FUVCxcbiAgICAgICAgcmVhZFByZWZlcmVuY2U6IGRlZmF1bHRHcmFwaFFMVHlwZXMuUkVBRF9QUkVGRVJFTkNFX0FUVCxcbiAgICAgICAgaW5jbHVkZVJlYWRQcmVmZXJlbmNlOiBkZWZhdWx0R3JhcGhRTFR5cGVzLklOQ0xVREVfUkVBRF9QUkVGRVJFTkNFX0FUVCxcbiAgICAgIH0sXG4gICAgICB0eXBlOiBuZXcgR3JhcGhRTE5vbk51bGwoZGVmYXVsdEdyYXBoUUxUeXBlcy5PQkpFQ1QpLFxuICAgICAgYXN5bmMgcmVzb2x2ZShfc291cmNlLCBhcmdzLCBjb250ZXh0KSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3Qge1xuICAgICAgICAgICAgY2xhc3NOYW1lLFxuICAgICAgICAgICAgb2JqZWN0SWQsXG4gICAgICAgICAgICBrZXlzLFxuICAgICAgICAgICAgaW5jbHVkZSxcbiAgICAgICAgICAgIHJlYWRQcmVmZXJlbmNlLFxuICAgICAgICAgICAgaW5jbHVkZVJlYWRQcmVmZXJlbmNlLFxuICAgICAgICAgIH0gPSBhcmdzO1xuXG4gICAgICAgICAgY29uc3QgeyBjb25maWcsIGF1dGgsIGluZm8gfSA9IGNvbnRleHQ7XG5cbiAgICAgICAgICByZXR1cm4gYXdhaXQgZ2V0T2JqZWN0KFxuICAgICAgICAgICAgY2xhc3NOYW1lLFxuICAgICAgICAgICAgb2JqZWN0SWQsXG4gICAgICAgICAgICBrZXlzLFxuICAgICAgICAgICAgaW5jbHVkZSxcbiAgICAgICAgICAgIHJlYWRQcmVmZXJlbmNlLFxuICAgICAgICAgICAgaW5jbHVkZVJlYWRQcmVmZXJlbmNlLFxuICAgICAgICAgICAgY29uZmlnLFxuICAgICAgICAgICAgYXV0aCxcbiAgICAgICAgICAgIGluZm9cbiAgICAgICAgICApO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgcGFyc2VHcmFwaFFMU2NoZW1hLmhhbmRsZUVycm9yKGUpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgIH0sXG4gICAgdHJ1ZSxcbiAgICB0cnVlXG4gICk7XG5cbiAgcGFyc2VHcmFwaFFMU2NoZW1hLmFkZEdyYXBoUUxRdWVyeShcbiAgICAnZmluZCcsXG4gICAge1xuICAgICAgZGVzY3JpcHRpb246XG4gICAgICAgICdUaGUgZmluZCBxdWVyeSBjYW4gYmUgdXNlZCB0byBmaW5kIG9iamVjdHMgb2YgYSBjZXJ0YWluIGNsYXNzLicsXG4gICAgICBhcmdzOiB7XG4gICAgICAgIGNsYXNzTmFtZTogZGVmYXVsdEdyYXBoUUxUeXBlcy5DTEFTU19OQU1FX0FUVCxcbiAgICAgICAgd2hlcmU6IGRlZmF1bHRHcmFwaFFMVHlwZXMuV0hFUkVfQVRULFxuICAgICAgICBvcmRlcjoge1xuICAgICAgICAgIGRlc2NyaXB0aW9uOlxuICAgICAgICAgICAgJ1RoaXMgaXMgdGhlIG9yZGVyIGluIHdoaWNoIHRoZSBvYmplY3RzIHNob3VsZCBiZSByZXR1cm5lZCcsXG4gICAgICAgICAgdHlwZTogR3JhcGhRTFN0cmluZyxcbiAgICAgICAgfSxcbiAgICAgICAgc2tpcDogZGVmYXVsdEdyYXBoUUxUeXBlcy5TS0lQX0FUVCxcbiAgICAgICAgbGltaXQ6IGRlZmF1bHRHcmFwaFFMVHlwZXMuTElNSVRfQVRULFxuICAgICAgICBrZXlzOiBkZWZhdWx0R3JhcGhRTFR5cGVzLktFWVNfQVRULFxuICAgICAgICBpbmNsdWRlOiBkZWZhdWx0R3JhcGhRTFR5cGVzLklOQ0xVREVfQVRULFxuICAgICAgICBpbmNsdWRlQWxsOiB7XG4gICAgICAgICAgZGVzY3JpcHRpb246ICdBbGwgcG9pbnRlcnMgd2lsbCBiZSByZXR1cm5lZCcsXG4gICAgICAgICAgdHlwZTogR3JhcGhRTEJvb2xlYW4sXG4gICAgICAgIH0sXG4gICAgICAgIHJlYWRQcmVmZXJlbmNlOiBkZWZhdWx0R3JhcGhRTFR5cGVzLlJFQURfUFJFRkVSRU5DRV9BVFQsXG4gICAgICAgIGluY2x1ZGVSZWFkUHJlZmVyZW5jZTogZGVmYXVsdEdyYXBoUUxUeXBlcy5JTkNMVURFX1JFQURfUFJFRkVSRU5DRV9BVFQsXG4gICAgICAgIHN1YnF1ZXJ5UmVhZFByZWZlcmVuY2U6XG4gICAgICAgICAgZGVmYXVsdEdyYXBoUUxUeXBlcy5TVUJRVUVSWV9SRUFEX1BSRUZFUkVOQ0VfQVRULFxuICAgICAgfSxcbiAgICAgIHR5cGU6IG5ldyBHcmFwaFFMTm9uTnVsbChkZWZhdWx0R3JhcGhRTFR5cGVzLkZJTkRfUkVTVUxUKSxcbiAgICAgIGFzeW5jIHJlc29sdmUoX3NvdXJjZSwgYXJncywgY29udGV4dCwgcXVlcnlJbmZvKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3Qge1xuICAgICAgICAgICAgY2xhc3NOYW1lLFxuICAgICAgICAgICAgd2hlcmUsXG4gICAgICAgICAgICBvcmRlcixcbiAgICAgICAgICAgIHNraXAsXG4gICAgICAgICAgICBsaW1pdCxcbiAgICAgICAgICAgIGtleXMsXG4gICAgICAgICAgICBpbmNsdWRlLFxuICAgICAgICAgICAgaW5jbHVkZUFsbCxcbiAgICAgICAgICAgIHJlYWRQcmVmZXJlbmNlLFxuICAgICAgICAgICAgaW5jbHVkZVJlYWRQcmVmZXJlbmNlLFxuICAgICAgICAgICAgc3VicXVlcnlSZWFkUHJlZmVyZW5jZSxcbiAgICAgICAgICB9ID0gYXJncztcblxuICAgICAgICAgIGNvbnN0IHsgY29uZmlnLCBhdXRoLCBpbmZvIH0gPSBjb250ZXh0O1xuICAgICAgICAgIGNvbnN0IHNlbGVjdGVkRmllbGRzID0gZ2V0RmllbGROYW1lcyhxdWVyeUluZm8pO1xuXG4gICAgICAgICAgcmV0dXJuIGF3YWl0IGZpbmRPYmplY3RzKFxuICAgICAgICAgICAgY2xhc3NOYW1lLFxuICAgICAgICAgICAgd2hlcmUsXG4gICAgICAgICAgICBvcmRlcixcbiAgICAgICAgICAgIHNraXAsXG4gICAgICAgICAgICBsaW1pdCxcbiAgICAgICAgICAgIGtleXMsXG4gICAgICAgICAgICBpbmNsdWRlLFxuICAgICAgICAgICAgaW5jbHVkZUFsbCxcbiAgICAgICAgICAgIHJlYWRQcmVmZXJlbmNlLFxuICAgICAgICAgICAgaW5jbHVkZVJlYWRQcmVmZXJlbmNlLFxuICAgICAgICAgICAgc3VicXVlcnlSZWFkUHJlZmVyZW5jZSxcbiAgICAgICAgICAgIGNvbmZpZyxcbiAgICAgICAgICAgIGF1dGgsXG4gICAgICAgICAgICBpbmZvLFxuICAgICAgICAgICAgc2VsZWN0ZWRGaWVsZHNcbiAgICAgICAgICApO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgcGFyc2VHcmFwaFFMU2NoZW1hLmhhbmRsZUVycm9yKGUpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgIH0sXG4gICAgdHJ1ZSxcbiAgICB0cnVlXG4gICk7XG59O1xuXG5leHBvcnQgeyBnZXRPYmplY3QsIGZpbmRPYmplY3RzLCBsb2FkIH07XG4iXX0=