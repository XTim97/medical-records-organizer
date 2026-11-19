/* Dedicated service worker for the Medical Records Organizer only. */
self.addEventListener('push', event => {
  let payload = {title: 'Appointment reminder', body: 'You have an upcoming appointment.'};
  try { if(event.data) payload = {...payload,...event.data.json()}; } catch {}
  event.waitUntil(self.registration.showNotification(
    String(payload.title || 'Appointment reminder').slice(0,100),
    {body: String(payload.body || 'You have an upcoming appointment.').slice(0,200),
     tag: String(payload.tag || 'medical-appointment'), data: {url: self.registration.scope}}
  ));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(windows => {
    const open = windows.find(client => client.url.startsWith(self.registration.scope));
    return open ? open.focus() : self.clients.openWindow(self.registration.scope);
  }));
});
