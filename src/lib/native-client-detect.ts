/** Native apps may request JWT in JSON; browsers use HttpOnly cookies only. */
export function isNativeClientRequest(request: Request) {
  return request.headers.get("x-sarjan-native-client") === "1";
}

export function isNativeAdminRequest(request: Request) {
  return request.headers.get("x-sarjan-native-admin") === "1";
}
