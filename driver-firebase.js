const sdkRoot = 'https://www.gstatic.com/firebasejs/10.8.0/';
const feedback = document.querySelector('#firebase-feedback');
const sms = document.querySelector('#firebase-sms');
let connection;
let confirmation;

async function connect() {
  connection ??= Promise.all([
    import(sdkRoot + 'firebase-app.js'),
    import(sdkRoot + 'firebase-auth.js'),
  ]).then(async ([app, sdk]) => {
    const auth = sdk.getAuth(app.initializeApp({
      apiKey: 'AIzaSyAyPZNWaxf65QPb6qXQz211s6yjuP4NzQE',
      authDomain: 'ruvi-pasajeros.firebaseapp.com',
      projectId: 'ruvi-pasajeros',
      appId: '1:559173860907:web:03ce30fced6e388e99346e',
    }));
    await sdk.setPersistence(auth, sdk.inMemoryPersistence);
    return { sdk, auth };
  }).catch(error => {
    connection = undefined;
    throw error;
  });
  return connection;
}

async function useIdentity(user, auth, sdk) {
  try {
    const response = await fetch('/auth/firebase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: await user.getIdToken() }),
    });
    const result = await response.json();
    if (response.ok) location.assign('/conductores/?pais=VE');
    else feedback.textContent = result.error === 'account_not_linked'
      ? 'Entra primero con tu correo y contraseña. Luego vuelve a esta pantalla para vincular tu acceso.'
      : 'No se pudo validar el acceso. Intenta otra vez.';
  } finally {
    await sdk.signOut(auth);
  }
}

function handle(control, action) {
  return async event => {
    event.preventDefault();
    if (control.disabled) return;
    control.disabled = true;
    feedback.textContent = '';
    try {
      await action();
    } catch {
      feedback.textContent = 'No se pudo completar el acceso. Intenta otra vez.';
    } finally {
      control.disabled = false;
    }
  };
}

const google = document.querySelector('#firebase-google');
google.addEventListener('click', handle(google, async () => {
  const { auth, sdk } = await connect();
  const result = await sdk.signInWithPopup(auth, new sdk.GoogleAuthProvider());
  await useIdentity(result.user, auth, sdk);
}));

const send = document.querySelector('#firebase-send');
send.addEventListener('click', handle(send, async () => {
  const number = sms.elements.phone.value.trim().replace(/[\s()-]/g, '');
  if (!/^\+[1-9]\d{7,14}$/.test(number)) {
    feedback.textContent = 'Escribe tu número con código de país, por ejemplo +58.';
    return;
  }
  confirmation = undefined;
  const { auth, sdk } = await connect();
  const verifier = new sdk.RecaptchaVerifier(auth, send, { size: 'invisible' });
  try {
    confirmation = await sdk.signInWithPhoneNumber(auth, number, verifier);
    feedback.textContent = 'Ingresa el código que recibiste por SMS.';
    sms.elements.code.focus();
  } finally {
    verifier.clear();
  }
}));

sms.addEventListener('submit', handle(document.querySelector('#firebase-verify'), async () => {
  if (!confirmation) {
    feedback.textContent = 'Solicita un código primero.';
    return;
  }
  const { auth, sdk } = await connect();
  const result = await confirmation.confirm(sms.elements.code.value.trim());
  confirmation = undefined;
  await useIdentity(result.user, auth, sdk);
}));
