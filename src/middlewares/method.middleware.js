import { METHODS, STATUES } from '#configs/constants.js';
import { API_ROUTE_METHODS } from '#configs/routeMethods.config.js';
import { setErrorResponse } from '#utils/helpers.js';

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const compileRoute = ({ path, methods }) => {
  const segments = path.split('/').filter(Boolean);
  const staticSegments = segments.filter(
    (segment) => !segment.startsWith(':'),
  ).length;
  const pattern = segments
    .map((segment) =>
      segment.startsWith(':') ? '[^/]+' : escapeRegExp(segment),
    )
    .join('/');

  return {
    methods: methods.map((method) => method.toUpperCase()),
    pattern: new RegExp(`^/${pattern}/?$`),
    specificity: staticSegments * 100 + segments.length,
  };
};

const compiledApiRoutes = API_ROUTE_METHODS.map(compileRoute);

const rejectMethod = (res, allowedMethods) => {
  res.set('Allow', allowedMethods.join(', '));
  setErrorResponse(STATUES.METHOD_NOT_ALLOWED, {
    message: 'متد درخواست برای این مسیر مجاز نیست',
  });
};

export const allowMethods = (...methods) => {
  const allowedMethods = methods.map((method) => method.toUpperCase());

  return (req, res, next) => {
    if (allowedMethods.includes(req.method)) {
      next();
      return;
    }

    rejectMethod(res, allowedMethods);
  };
};

export const apiMethodMiddleware = (req, res, next) => {
  const matches = compiledApiRoutes.filter(({ pattern }) =>
    pattern.test(req.path),
  );

  if (matches.length === 0) {
    next();
    return;
  }

  const highestSpecificity = Math.max(
    ...matches.map(({ specificity }) => specificity),
  );
  const allowedMethods = [
    ...new Set(
      matches
        .filter(({ specificity }) => specificity === highestSpecificity)
        .flatMap(({ methods }) => methods),
    ),
  ];

  if (
    allowedMethods.includes(req.method) ||
    (req.method === METHODS.head && allowedMethods.includes(METHODS.get))
  ) {
    next();
    return;
  }

  const allowHeader = allowedMethods.includes(METHODS.get)
    ? [...allowedMethods, METHODS.head]
    : allowedMethods;
  rejectMethod(res, allowHeader);
};
