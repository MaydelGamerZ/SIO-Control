import { useEffect, useState } from 'react'
import { getUserProfile, upsertUserProfile } from '../services/userService'
import { useAuth } from './useAuth'

export function useUserProfile() {
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [profile, setProfile] = useState(null)
  const { user } = useAuth()

  useEffect(() => {
    let active = true

    async function loadProfile() {
      if (!user?.uid) {
        setProfile(null)
        setLoadingProfile(false)
        return
      }

      setLoadingProfile(true)
      await upsertUserProfile(user).catch(() => {})
      const loadedProfile = await getUserProfile(user.uid).catch(() => null)
      if (active) {
        setProfile(loadedProfile)
        setLoadingProfile(false)
      }
    }

    loadProfile()
    return () => {
      active = false
    }
  }, [user])

  return { loadingProfile, profile }
}
