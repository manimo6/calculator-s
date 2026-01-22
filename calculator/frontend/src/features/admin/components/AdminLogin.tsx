import React, { useRef, useState, useEffect } from "react"
import { User } from "lucide-react"
import Lottie from "lottie-react"
import faceIdAnimation from "./FaceID.json"
import loginAnimation from "./check.json"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { auth } from "@/auth"

const AdminLogin = ({ onLogin }) => {
  const [username, setUsername] = useState<any>("")
  const [password, setPassword] = useState<any>("")
  const [error, setError] = useState<any>("")
  const [loading, setLoading] = useState<any>(false)
  const [isLoginSuccess, setIsLoginSuccess] = useState<any>(false)
  const [loggedInUser, setLoggedInUser] = useState<any>(null)
  const cardRef = useRef(null)
  const rafRef = useRef(null)

  const lottieRef = useRef(null)



  // Additional elements can be added here if needed for the ID card look


  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const user = await auth.login(username, password)
      setLoggedInUser(user)
      setIsLoginSuccess(true)
      // onLogin(user) will be called after animation completes
    } catch (err) {
      setError(err?.message || "로그인에 실패했습니다.")
    } finally {
      setLoading(false)
    }
  }

  const handleCardMouseMove = (event) => {
    const card = cardRef.current
    if (!card) return

    const rect = card.getBoundingClientRect()
    const x = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1)
    const y = Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 1)

    const tiltX = (0.5 - y) * 40
    const tiltY = (x - 0.5) * 46
    const percentX = x * 100
    const percentY = y * 100
    const centerX = percentX - 50
    const centerY = percentY - 50
    const hyp = Math.min(Math.hypot(centerX, centerY) / 50, 1)
    const effectOpacity = (1 - hyp) * 0.7 + 0.15

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      card.style.setProperty("--tilt-x", `${tiltX}deg`)
      card.style.setProperty("--tilt-y", `${tiltY}deg`)
      card.style.setProperty("--rx", `${tiltY}deg`)
      card.style.setProperty("--ry", `${tiltX}deg`)
      card.style.setProperty("--angle", `${-(Math.atan2(x - 0.5, y - 0.5) * (180 / Math.PI)).toFixed(2)}deg`)
      card.style.setProperty("--mx", `${percentX.toFixed(2)}%`)
      card.style.setProperty("--my", `${percentY.toFixed(2)}%`)
      card.style.setProperty("--posx", `${percentX.toFixed(2)}%`)
      card.style.setProperty("--posy", `${percentY.toFixed(2)}%`)
      card.style.setProperty("--pos", `${percentX.toFixed(2)}% ${percentY.toFixed(2)}%`)
      card.style.setProperty("--hyp", hyp.toFixed(3))
      card.style.setProperty("--o", effectOpacity.toFixed(2))
    })
  }

  const handleCardMouseLeave = () => {
    const card = cardRef.current
    if (!card) return
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    card.style.setProperty("--tilt-x", "0deg")
    card.style.setProperty("--tilt-y", "0deg")
    card.style.setProperty("--rx", "0deg")
    card.style.setProperty("--ry", "0deg")
    card.style.setProperty("--mx", "50%")
    card.style.setProperty("--my", "50%")
    card.style.setProperty("--posx", "50%")
    card.style.setProperty("--posy", "50%")
    card.style.setProperty("--pos", "50% 50%")
    card.style.setProperty("--hyp", "0")
    card.style.setProperty("--o", "0")
    card.style.setProperty("--lift", "0px")
  }

  return (
    <div className="admin-login-stage flex min-h-screen items-center justify-center p-4">
      <Card
        ref={cardRef}
        className="admin-login-card w-[340px] h-[550px] flex flex-col justify-start pt-24 gap-32 border-0 bg-transparent text-black select-none"
        onMouseMove={handleCardMouseMove}
        onMouseLeave={handleCardMouseLeave}
      >
        <div className="admin-login-holofoil absolute inset-0 rounded-[40px] pointer-events-none z-0" />
        {/* Top Section: Header */}
        <div className="relative px-6 flex flex-col items-center">
          {/* visionOS Icon - Floating Glass */}
          <div className="w-20 h-20 rounded-full bg-white/40 flex items-center justify-center backdrop-blur-xl shadow-lg border border-white/40 overflow-hidden p-3">
            {isLoginSuccess ? (
              <Lottie
                lottieRef={lottieRef}
                animationData={loginAnimation}
                loop={false}
                className="w-full h-full scale-[3.0] opacity-90 translate-x-[0.5px]"
                onComplete={() => onLogin(loggedInUser)}
              />
            ) : username ? (
              <Lottie
                animationData={faceIdAnimation}
                loop={true}
                className="w-full h-full opacity-80 translate-x-[0.2px]"
              />
            ) : (
              <User className="w-9 h-9 text-black/70" strokeWidth={1.5} />
            )}
          </div>


        </div>

        {/* Middle Section: Form */}
        <CardContent className="px-6 w-full space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Input
                id="loginUsername"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="bg-white/40 border-none focus:bg-white/60 transition-all h-[44px] text-black placeholder:text-black/40 rounded-full px-5 shadow-sm hover:bg-white/50"
                placeholder="아이디"
              />
            </div>
            <div className="space-y-1.5">
              <Input
                id="loginPassword"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white/40 border-none focus:bg-white/60 transition-all h-[44px] text-black placeholder:text-black/40 rounded-full px-5 shadow-sm hover:bg-white/50"
                placeholder="비밀번호"
              />
            </div>
            {error ? (
              <div className="rounded-2xl bg-red-100/50 px-3 py-2 text-[13px] text-red-600 text-center font-medium backdrop-blur-sm">
                {error}
              </div>
            ) : null}

            <Button type="submit" className="w-full bg-[#0071e3] hover:bg-[#0077ED] text-white font-medium text-[17px] mt-6 h-[44px] rounded-full shadow-md transition-transform hover:scale-[1.02] border-none" disabled={loading}>
              {loading ? "인증 중..." : "로그인"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Lanyard String (Visual only) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-[50vh] bg-slate-800/20 pointer-events-none -z-10" />
    </div>
  )
}

export default AdminLogin

