export const estAndroid = /Android/i.test(navigator.userAgent);

export const estInstallee = () =>
  matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;

interface InvitationInstallation extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Sur Android, Chrome propose l'installation : on garde l'invitation pour un bouton « Installer ». */
export const installation = $state({ invitation: null as InvitationInstallation | null });

addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installation.invitation = e as InvitationInstallation;
});

addEventListener('appinstalled', () => (installation.invitation = null));

export async function installer(): Promise<boolean> {
  const inv = installation.invitation;
  if (!inv) return false;
  await inv.prompt();
  const { outcome } = await inv.userChoice;
  installation.invitation = null;
  return outcome === 'accepted';
}
