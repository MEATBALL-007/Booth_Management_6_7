import { getFirebaseConfig } from './firebase'

test('getFirebaseConfig reads all required VITE_FB_ keys', () => {
  const cfg = getFirebaseConfig()
  expect(cfg).toHaveProperty('projectId')
  expect(cfg).toHaveProperty('apiKey')
  expect(cfg).toHaveProperty('appId')
})
