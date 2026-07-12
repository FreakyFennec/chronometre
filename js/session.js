createSession()

export function createSession(activite, duree) {
  return {
    activite: activite,
    duree: duree,
    date: new Date().toISOString()
  };
}