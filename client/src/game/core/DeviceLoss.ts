export function observeDeviceLoss(lost: Promise<{ reason?: string }>, isDisposed: () => boolean, recover: () => void): void {
  void lost.then(info => { if (!isDisposed() && info.reason !== 'destroyed') recover(); });
}
