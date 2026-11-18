if (
  typeof Headers !== 'undefined' &&
  Headers.prototype.getSetCookie == null
) {
  Object.defineProperty(Headers.prototype, 'getSetCookie', {
    /**
     * React Native combines multiple "Set-Cookie" headers into a single
     * comma-separated value. Split it only on the commas followed by
     * a new cookie pair to preserve the commas in cookie attributes
     * (e.g. "Expires=Wed, 21 Oct 2015 07:28:00 GMT").
     * @this {Headers}
     * @returns {Array<string>}
     */
    value: function getSetCookie() {
      const combinedCookies = this.get('set-cookie')

      if (combinedCookies == null) {
        return []
      }

      return combinedCookies
        .split(/,(?=\s*[^;,=\s]+=)/)
        .map((cookie) => {
          return cookie.trim()
        })
        .filter((cookie) => {
          return cookie !== ''
        })
    },
    writable: true,
    configurable: true,
  })
}
