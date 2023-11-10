// @ts-check
import {
  isFunction,
  isAsyncFunction,
  removeTrailingSlash,
  findAnchor,
  shouldRouterHandleClick,
} from "./utils.js";

/**
 * Class representing a router.
 */
export default class CucumberRouter {
  /**
   * Creates a new BreezeRouter instance.
   * @constructor
   * @param {HTMLElement} outlet - outlet to render template content that match current url
   */
  constructor(outlet) {
    this.outlet = outlet;
    /**
     * Object containing all registered routes.
     * @type {import('./types.js').Route}
     * @private
     */
    this._routes = Array.from(document.querySelectorAll('body > template[path]')).map(template => {
      return {
        path: template.getAttribute('path'),
        template,
      }
    });

    console.log(this._routes);

    /**
     * The previous route that was navigated to
     * @type {import('./types.js').Route}
     * @private
     */
    this._previousRoute = {};

    // Bind event listeners
    window.addEventListener("popstate", this._onChanged.bind(this));
    document.body.addEventListener("click", this._handleClick.bind(this));
  }

  /**
   * Starts the router.
   * @returns {void}
   */
  start() {
    this._onChanged();
  }

  /**
   * Navigates to the specified URL.
   * @param {string} url - The URL to navigate to
   * @returns {void}
   */
  navigateTo(url) {
    window.history.pushState({ url }, "", url);
    this._onChanged();
  }

  /**
   * Redirects a URL
   * @param {string} url
   * @returns {void}
   */
  redirect(url) {
    this.navigateTo(url);
  }

  async _onChanged() {
    const path = window.location.pathname;
    const { route, params } = this._matchUrlToRoute(path);

    console.log({ route, params });
    // If no matching route found, route will be '404' route
    // which has been handled by _matchUrlToRoute already
    // await this._handleRoute({ route, params });


    // Render template content into router outlet
    const template = route.template;
    console.log('template', template);
    this.outlet.innerHTML = '';
    const spinnerID = this.outlet.getAttribute('router-spinner');
    const spinner = document.querySelector(`template#${spinnerID}`).content.cloneNode(true);
    this.outlet.appendChild(spinner);

    // If we have async script that need to fetch data from server/database
    const asyncScript = template.content.querySelector('script[async]');
    this.outlet.firstElementChild.remove();
    this.outlet.appendChild(template.content.cloneNode(true));
  }

  /**
   * Processes route callbacks registered by app
   * @param {import('./types.js').MatchedRoute} options
   * @returns {Promise<void>}
   */
  async _handleRoute({ route, params }) {
    if (isFunction(route.handler)) {
      route.handler({ route, params });
    }

    if (isAsyncFunction(route.handler)) {
      await route.handler({ route, params });
    }
  }

  /**
   *
   * @param {string} url - Current url users visite or nagivate to.
   * @returns {import('./types.js').MatchedRoute}
   */
  _matchUrlToRoute(url) {
    /** @type {import('./types.js').RouteParams} */
    const params = {};

    if (url !== "/") {
      url = removeTrailingSlash(url);
    }

    const matchedRoute = this._routes.find((route) => {
      if (url.split("/").length !== route.path.split("/").length) {
        return false;
      }

      let routeSegments = route.path.split("/").slice(1);
      let urlSegments = url.split("/").slice(1);

      // If each segment in the url matches the corresponding segment in the route path,
      // or the route path segment starts with a ':' then the route is matched.
      const match = routeSegments.every((segment, i) => {
        return segment === urlSegments[i] || segment.startsWith(":");
      });

      if (!match) {
        return false;
      }

      // If the route matches the URL, pull out any params from the URL.
      routeSegments.forEach((segment, i) => {
        if (segment.startsWith(":")) {
          const propName = segment.slice(1);
          params[propName] = decodeURIComponent(urlSegments[i]);
        }
      });

      return true;
    });

    if (matchedRoute) {
      return { route: matchedRoute, params };
    } else {
      return { route: this._routes[404], params };
    }
  }

  /**
   * Handles <a> link clicks
   * @param {Event} event
   * @returns {void}
   */
  _handleClick(event) {
    const anchor = findAnchor(event);
    if (!anchor) {
      return;
    }

    if (!shouldRouterHandleClick(event, anchor)) {
      return;
    }

    event.preventDefault();
    let href = anchor.getAttribute("href").trim();
    if (!href.startsWith("/")) {
      href = "/" + href;
    }

    this.navigateTo(href);
  }
}
