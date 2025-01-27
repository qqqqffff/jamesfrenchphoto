/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file was automatically generated by TanStack Router.
// You should NOT make any changes in this file as it will be overwritten.
// Additionally, you should also exclude this file from your linter and/or formatter to prevent it from being checked or modified.

// Import Routes

import { Route as rootRoute } from './routes/__root'
import { Route as RegisterImport } from './routes/register'
import { Route as LoginImport } from './routes/login'
import { Route as AuthImport } from './routes/_auth'
import { Route as IndexImport } from './routes/index'
import { Route as AuthPhotoFullscreenImport } from './routes/_auth.photo-fullscreen'
import { Route as AuthPhotoCollectionIdImport } from './routes/_auth.photo-collection.$id'
import { Route as AuthClientProfileImport } from './routes/_auth.client/profile'
import { Route as AuthClientDashboardImport } from './routes/_auth.client/dashboard'
import { Route as AuthAdminDashboardImport } from './routes/_auth.admin/dashboard'
import { Route as AuthClientDashboardIndexImport } from './routes/_auth.client/dashboard/index'
import { Route as AuthAdminDashboardIndexImport } from './routes/_auth.admin/dashboard/index'
import { Route as AuthClientDashboardSchedulerImport } from './routes/_auth.client/dashboard/scheduler'
import { Route as AuthAdminDashboardUserImport } from './routes/_auth.admin/dashboard/user'
import { Route as AuthAdminDashboardSchedulerImport } from './routes/_auth.admin/dashboard/scheduler'
import { Route as AuthAdminDashboardPackageImport } from './routes/_auth.admin/dashboard/package'
import { Route as AuthAdminDashboardCollectionImport } from './routes/_auth.admin/dashboard/collection'

// Create/Update Routes

const RegisterRoute = RegisterImport.update({
  id: '/register',
  path: '/register',
  getParentRoute: () => rootRoute,
} as any)

const LoginRoute = LoginImport.update({
  id: '/login',
  path: '/login',
  getParentRoute: () => rootRoute,
} as any)

const AuthRoute = AuthImport.update({
  id: '/_auth',
  getParentRoute: () => rootRoute,
} as any)

const IndexRoute = IndexImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => rootRoute,
} as any)

const AuthPhotoFullscreenRoute = AuthPhotoFullscreenImport.update({
  id: '/photo-fullscreen',
  path: '/photo-fullscreen',
  getParentRoute: () => AuthRoute,
} as any)

const AuthPhotoCollectionIdRoute = AuthPhotoCollectionIdImport.update({
  id: '/photo-collection/$id',
  path: '/photo-collection/$id',
  getParentRoute: () => AuthRoute,
} as any)

const AuthClientProfileRoute = AuthClientProfileImport.update({
  id: '/client/profile',
  path: '/client/profile',
  getParentRoute: () => AuthRoute,
} as any)

const AuthClientDashboardRoute = AuthClientDashboardImport.update({
  id: '/client/dashboard',
  path: '/client/dashboard',
  getParentRoute: () => AuthRoute,
} as any)

const AuthAdminDashboardRoute = AuthAdminDashboardImport.update({
  id: '/admin/dashboard',
  path: '/admin/dashboard',
  getParentRoute: () => AuthRoute,
} as any)

const AuthClientDashboardIndexRoute = AuthClientDashboardIndexImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => AuthClientDashboardRoute,
} as any)

const AuthAdminDashboardIndexRoute = AuthAdminDashboardIndexImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => AuthAdminDashboardRoute,
} as any)

const AuthClientDashboardSchedulerRoute =
  AuthClientDashboardSchedulerImport.update({
    id: '/scheduler',
    path: '/scheduler',
    getParentRoute: () => AuthClientDashboardRoute,
  } as any)

const AuthAdminDashboardUserRoute = AuthAdminDashboardUserImport.update({
  id: '/user',
  path: '/user',
  getParentRoute: () => AuthAdminDashboardRoute,
} as any)

const AuthAdminDashboardSchedulerRoute =
  AuthAdminDashboardSchedulerImport.update({
    id: '/scheduler',
    path: '/scheduler',
    getParentRoute: () => AuthAdminDashboardRoute,
  } as any)

const AuthAdminDashboardPackageRoute = AuthAdminDashboardPackageImport.update({
  id: '/package',
  path: '/package',
  getParentRoute: () => AuthAdminDashboardRoute,
} as any)

const AuthAdminDashboardCollectionRoute =
  AuthAdminDashboardCollectionImport.update({
    id: '/collection',
    path: '/collection',
    getParentRoute: () => AuthAdminDashboardRoute,
  } as any)

// Populate the FileRoutesByPath interface

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexImport
      parentRoute: typeof rootRoute
    }
    '/_auth': {
      id: '/_auth'
      path: ''
      fullPath: ''
      preLoaderRoute: typeof AuthImport
      parentRoute: typeof rootRoute
    }
    '/login': {
      id: '/login'
      path: '/login'
      fullPath: '/login'
      preLoaderRoute: typeof LoginImport
      parentRoute: typeof rootRoute
    }
    '/register': {
      id: '/register'
      path: '/register'
      fullPath: '/register'
      preLoaderRoute: typeof RegisterImport
      parentRoute: typeof rootRoute
    }
    '/_auth/photo-fullscreen': {
      id: '/_auth/photo-fullscreen'
      path: '/photo-fullscreen'
      fullPath: '/photo-fullscreen'
      preLoaderRoute: typeof AuthPhotoFullscreenImport
      parentRoute: typeof AuthImport
    }
    '/_auth/admin/dashboard': {
      id: '/_auth/admin/dashboard'
      path: '/admin/dashboard'
      fullPath: '/admin/dashboard'
      preLoaderRoute: typeof AuthAdminDashboardImport
      parentRoute: typeof AuthImport
    }
    '/_auth/client/dashboard': {
      id: '/_auth/client/dashboard'
      path: '/client/dashboard'
      fullPath: '/client/dashboard'
      preLoaderRoute: typeof AuthClientDashboardImport
      parentRoute: typeof AuthImport
    }
    '/_auth/client/profile': {
      id: '/_auth/client/profile'
      path: '/client/profile'
      fullPath: '/client/profile'
      preLoaderRoute: typeof AuthClientProfileImport
      parentRoute: typeof AuthImport
    }
    '/_auth/photo-collection/$id': {
      id: '/_auth/photo-collection/$id'
      path: '/photo-collection/$id'
      fullPath: '/photo-collection/$id'
      preLoaderRoute: typeof AuthPhotoCollectionIdImport
      parentRoute: typeof AuthImport
    }
    '/_auth/admin/dashboard/collection': {
      id: '/_auth/admin/dashboard/collection'
      path: '/collection'
      fullPath: '/admin/dashboard/collection'
      preLoaderRoute: typeof AuthAdminDashboardCollectionImport
      parentRoute: typeof AuthAdminDashboardImport
    }
    '/_auth/admin/dashboard/package': {
      id: '/_auth/admin/dashboard/package'
      path: '/package'
      fullPath: '/admin/dashboard/package'
      preLoaderRoute: typeof AuthAdminDashboardPackageImport
      parentRoute: typeof AuthAdminDashboardImport
    }
    '/_auth/admin/dashboard/scheduler': {
      id: '/_auth/admin/dashboard/scheduler'
      path: '/scheduler'
      fullPath: '/admin/dashboard/scheduler'
      preLoaderRoute: typeof AuthAdminDashboardSchedulerImport
      parentRoute: typeof AuthAdminDashboardImport
    }
    '/_auth/admin/dashboard/user': {
      id: '/_auth/admin/dashboard/user'
      path: '/user'
      fullPath: '/admin/dashboard/user'
      preLoaderRoute: typeof AuthAdminDashboardUserImport
      parentRoute: typeof AuthAdminDashboardImport
    }
    '/_auth/client/dashboard/scheduler': {
      id: '/_auth/client/dashboard/scheduler'
      path: '/scheduler'
      fullPath: '/client/dashboard/scheduler'
      preLoaderRoute: typeof AuthClientDashboardSchedulerImport
      parentRoute: typeof AuthClientDashboardImport
    }
    '/_auth/admin/dashboard/': {
      id: '/_auth/admin/dashboard/'
      path: '/'
      fullPath: '/admin/dashboard/'
      preLoaderRoute: typeof AuthAdminDashboardIndexImport
      parentRoute: typeof AuthAdminDashboardImport
    }
    '/_auth/client/dashboard/': {
      id: '/_auth/client/dashboard/'
      path: '/'
      fullPath: '/client/dashboard/'
      preLoaderRoute: typeof AuthClientDashboardIndexImport
      parentRoute: typeof AuthClientDashboardImport
    }
  }
}

// Create and export the route tree

interface AuthAdminDashboardRouteChildren {
  AuthAdminDashboardCollectionRoute: typeof AuthAdminDashboardCollectionRoute
  AuthAdminDashboardPackageRoute: typeof AuthAdminDashboardPackageRoute
  AuthAdminDashboardSchedulerRoute: typeof AuthAdminDashboardSchedulerRoute
  AuthAdminDashboardUserRoute: typeof AuthAdminDashboardUserRoute
  AuthAdminDashboardIndexRoute: typeof AuthAdminDashboardIndexRoute
}

const AuthAdminDashboardRouteChildren: AuthAdminDashboardRouteChildren = {
  AuthAdminDashboardCollectionRoute: AuthAdminDashboardCollectionRoute,
  AuthAdminDashboardPackageRoute: AuthAdminDashboardPackageRoute,
  AuthAdminDashboardSchedulerRoute: AuthAdminDashboardSchedulerRoute,
  AuthAdminDashboardUserRoute: AuthAdminDashboardUserRoute,
  AuthAdminDashboardIndexRoute: AuthAdminDashboardIndexRoute,
}

const AuthAdminDashboardRouteWithChildren =
  AuthAdminDashboardRoute._addFileChildren(AuthAdminDashboardRouteChildren)

interface AuthClientDashboardRouteChildren {
  AuthClientDashboardSchedulerRoute: typeof AuthClientDashboardSchedulerRoute
  AuthClientDashboardIndexRoute: typeof AuthClientDashboardIndexRoute
}

const AuthClientDashboardRouteChildren: AuthClientDashboardRouteChildren = {
  AuthClientDashboardSchedulerRoute: AuthClientDashboardSchedulerRoute,
  AuthClientDashboardIndexRoute: AuthClientDashboardIndexRoute,
}

const AuthClientDashboardRouteWithChildren =
  AuthClientDashboardRoute._addFileChildren(AuthClientDashboardRouteChildren)

interface AuthRouteChildren {
  AuthPhotoFullscreenRoute: typeof AuthPhotoFullscreenRoute
  AuthAdminDashboardRoute: typeof AuthAdminDashboardRouteWithChildren
  AuthClientDashboardRoute: typeof AuthClientDashboardRouteWithChildren
  AuthClientProfileRoute: typeof AuthClientProfileRoute
  AuthPhotoCollectionIdRoute: typeof AuthPhotoCollectionIdRoute
}

const AuthRouteChildren: AuthRouteChildren = {
  AuthPhotoFullscreenRoute: AuthPhotoFullscreenRoute,
  AuthAdminDashboardRoute: AuthAdminDashboardRouteWithChildren,
  AuthClientDashboardRoute: AuthClientDashboardRouteWithChildren,
  AuthClientProfileRoute: AuthClientProfileRoute,
  AuthPhotoCollectionIdRoute: AuthPhotoCollectionIdRoute,
}

const AuthRouteWithChildren = AuthRoute._addFileChildren(AuthRouteChildren)

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '': typeof AuthRouteWithChildren
  '/login': typeof LoginRoute
  '/register': typeof RegisterRoute
  '/photo-fullscreen': typeof AuthPhotoFullscreenRoute
  '/admin/dashboard': typeof AuthAdminDashboardRouteWithChildren
  '/client/dashboard': typeof AuthClientDashboardRouteWithChildren
  '/client/profile': typeof AuthClientProfileRoute
  '/photo-collection/$id': typeof AuthPhotoCollectionIdRoute
  '/admin/dashboard/collection': typeof AuthAdminDashboardCollectionRoute
  '/admin/dashboard/package': typeof AuthAdminDashboardPackageRoute
  '/admin/dashboard/scheduler': typeof AuthAdminDashboardSchedulerRoute
  '/admin/dashboard/user': typeof AuthAdminDashboardUserRoute
  '/client/dashboard/scheduler': typeof AuthClientDashboardSchedulerRoute
  '/admin/dashboard/': typeof AuthAdminDashboardIndexRoute
  '/client/dashboard/': typeof AuthClientDashboardIndexRoute
}

export interface FileRoutesByTo {
  '/': typeof IndexRoute
  '': typeof AuthRouteWithChildren
  '/login': typeof LoginRoute
  '/register': typeof RegisterRoute
  '/photo-fullscreen': typeof AuthPhotoFullscreenRoute
  '/client/profile': typeof AuthClientProfileRoute
  '/photo-collection/$id': typeof AuthPhotoCollectionIdRoute
  '/admin/dashboard/collection': typeof AuthAdminDashboardCollectionRoute
  '/admin/dashboard/package': typeof AuthAdminDashboardPackageRoute
  '/admin/dashboard/scheduler': typeof AuthAdminDashboardSchedulerRoute
  '/admin/dashboard/user': typeof AuthAdminDashboardUserRoute
  '/client/dashboard/scheduler': typeof AuthClientDashboardSchedulerRoute
  '/admin/dashboard': typeof AuthAdminDashboardIndexRoute
  '/client/dashboard': typeof AuthClientDashboardIndexRoute
}

export interface FileRoutesById {
  __root__: typeof rootRoute
  '/': typeof IndexRoute
  '/_auth': typeof AuthRouteWithChildren
  '/login': typeof LoginRoute
  '/register': typeof RegisterRoute
  '/_auth/photo-fullscreen': typeof AuthPhotoFullscreenRoute
  '/_auth/admin/dashboard': typeof AuthAdminDashboardRouteWithChildren
  '/_auth/client/dashboard': typeof AuthClientDashboardRouteWithChildren
  '/_auth/client/profile': typeof AuthClientProfileRoute
  '/_auth/photo-collection/$id': typeof AuthPhotoCollectionIdRoute
  '/_auth/admin/dashboard/collection': typeof AuthAdminDashboardCollectionRoute
  '/_auth/admin/dashboard/package': typeof AuthAdminDashboardPackageRoute
  '/_auth/admin/dashboard/scheduler': typeof AuthAdminDashboardSchedulerRoute
  '/_auth/admin/dashboard/user': typeof AuthAdminDashboardUserRoute
  '/_auth/client/dashboard/scheduler': typeof AuthClientDashboardSchedulerRoute
  '/_auth/admin/dashboard/': typeof AuthAdminDashboardIndexRoute
  '/_auth/client/dashboard/': typeof AuthClientDashboardIndexRoute
}

export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths:
    | '/'
    | ''
    | '/login'
    | '/register'
    | '/photo-fullscreen'
    | '/admin/dashboard'
    | '/client/dashboard'
    | '/client/profile'
    | '/photo-collection/$id'
    | '/admin/dashboard/collection'
    | '/admin/dashboard/package'
    | '/admin/dashboard/scheduler'
    | '/admin/dashboard/user'
    | '/client/dashboard/scheduler'
    | '/admin/dashboard/'
    | '/client/dashboard/'
  fileRoutesByTo: FileRoutesByTo
  to:
    | '/'
    | ''
    | '/login'
    | '/register'
    | '/photo-fullscreen'
    | '/client/profile'
    | '/photo-collection/$id'
    | '/admin/dashboard/collection'
    | '/admin/dashboard/package'
    | '/admin/dashboard/scheduler'
    | '/admin/dashboard/user'
    | '/client/dashboard/scheduler'
    | '/admin/dashboard'
    | '/client/dashboard'
  id:
    | '__root__'
    | '/'
    | '/_auth'
    | '/login'
    | '/register'
    | '/_auth/photo-fullscreen'
    | '/_auth/admin/dashboard'
    | '/_auth/client/dashboard'
    | '/_auth/client/profile'
    | '/_auth/photo-collection/$id'
    | '/_auth/admin/dashboard/collection'
    | '/_auth/admin/dashboard/package'
    | '/_auth/admin/dashboard/scheduler'
    | '/_auth/admin/dashboard/user'
    | '/_auth/client/dashboard/scheduler'
    | '/_auth/admin/dashboard/'
    | '/_auth/client/dashboard/'
  fileRoutesById: FileRoutesById
}

export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute
  AuthRoute: typeof AuthRouteWithChildren
  LoginRoute: typeof LoginRoute
  RegisterRoute: typeof RegisterRoute
}

const rootRouteChildren: RootRouteChildren = {
  IndexRoute: IndexRoute,
  AuthRoute: AuthRouteWithChildren,
  LoginRoute: LoginRoute,
  RegisterRoute: RegisterRoute,
}

export const routeTree = rootRoute
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()

/* ROUTE_MANIFEST_START
{
  "routes": {
    "__root__": {
      "filePath": "__root.tsx",
      "children": [
        "/",
        "/_auth",
        "/login",
        "/register"
      ]
    },
    "/": {
      "filePath": "index.tsx"
    },
    "/_auth": {
      "filePath": "_auth.tsx",
      "children": [
        "/_auth/photo-fullscreen",
        "/_auth/admin/dashboard",
        "/_auth/client/dashboard",
        "/_auth/client/profile",
        "/_auth/photo-collection/$id"
      ]
    },
    "/login": {
      "filePath": "login.tsx"
    },
    "/register": {
      "filePath": "register.tsx"
    },
    "/_auth/photo-fullscreen": {
      "filePath": "_auth.photo-fullscreen.tsx",
      "parent": "/_auth"
    },
    "/_auth/admin/dashboard": {
      "filePath": "_auth.admin/dashboard.tsx",
      "parent": "/_auth",
      "children": [
        "/_auth/admin/dashboard/collection",
        "/_auth/admin/dashboard/package",
        "/_auth/admin/dashboard/scheduler",
        "/_auth/admin/dashboard/user",
        "/_auth/admin/dashboard/"
      ]
    },
    "/_auth/client/dashboard": {
      "filePath": "_auth.client/dashboard.tsx",
      "parent": "/_auth",
      "children": [
        "/_auth/client/dashboard/scheduler",
        "/_auth/client/dashboard/"
      ]
    },
    "/_auth/client/profile": {
      "filePath": "_auth.client/profile.tsx",
      "parent": "/_auth"
    },
    "/_auth/photo-collection/$id": {
      "filePath": "_auth.photo-collection.$id.tsx",
      "parent": "/_auth"
    },
    "/_auth/admin/dashboard/collection": {
      "filePath": "_auth.admin/dashboard/collection.tsx",
      "parent": "/_auth/admin/dashboard"
    },
    "/_auth/admin/dashboard/package": {
      "filePath": "_auth.admin/dashboard/package.tsx",
      "parent": "/_auth/admin/dashboard"
    },
    "/_auth/admin/dashboard/scheduler": {
      "filePath": "_auth.admin/dashboard/scheduler.tsx",
      "parent": "/_auth/admin/dashboard"
    },
    "/_auth/admin/dashboard/user": {
      "filePath": "_auth.admin/dashboard/user.tsx",
      "parent": "/_auth/admin/dashboard"
    },
    "/_auth/client/dashboard/scheduler": {
      "filePath": "_auth.client/dashboard/scheduler.tsx",
      "parent": "/_auth/client/dashboard"
    },
    "/_auth/admin/dashboard/": {
      "filePath": "_auth.admin/dashboard/index.tsx",
      "parent": "/_auth/admin/dashboard"
    },
    "/_auth/client/dashboard/": {
      "filePath": "_auth.client/dashboard/index.tsx",
      "parent": "/_auth/client/dashboard"
    }
  }
}
ROUTE_MANIFEST_END */
