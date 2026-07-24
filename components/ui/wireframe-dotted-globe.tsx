"use client"

import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"

interface RotatingEarthProps {
  width?: number
  height?: number
  className?: string
}

interface DotData {
  lng: number
  lat: number
  visible: boolean
}

let cachedLandFeatures: any = null;
let cachedAllDots: DotData[] | null = null;
let isFetchingGlobeData = false;
let fetchPromise: Promise<void> | null = null;

export default function RotatingEarth({ width = 800, height = 600, className = "" }: RotatingEarthProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const context = canvas.getContext("2d")
    if (!context) return

    // Set up responsive dimensions with capped DPR for optimal 60 FPS performance across devices
    const containerWidth = Math.max(10, Math.min(width, window.innerWidth - 40))
    const containerHeight = Math.max(10, Math.min(height, window.innerHeight - 100))
    const radius = Math.max(1, Math.min(containerWidth, containerHeight) / 2.5)

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = containerWidth * dpr
    canvas.height = containerHeight * dpr
    canvas.style.width = `${containerWidth}px`
    canvas.style.height = `${containerHeight}px`
    context.scale(dpr, dpr)

    // Create projection and path generator for Canvas
    const projection = d3
      .geoOrthographic()
      .scale(radius)
      .translate([containerWidth / 2, containerHeight / 2])
      .clipAngle(90)

    const path = d3.geoPath().projection(projection).context(context)

    const pointInPolygon = (point: [number, number], polygon: number[][]): boolean => {
      const [x, y] = point
      let inside = false

      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i]
        const [xj, yj] = polygon[j]

        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
          inside = !inside
        }
      }

      return inside
    }

    const pointInFeature = (point: [number, number], feature: any): boolean => {
      const geometry = feature.geometry

      if (geometry.type === "Polygon") {
        const coordinates = geometry.coordinates
        if (!pointInPolygon(point, coordinates[0])) return false
        for (let i = 1; i < coordinates.length; i++) {
          if (pointInPolygon(point, coordinates[i])) return false 
        }
        return true
      } else if (geometry.type === "MultiPolygon") {
        for (const polygon of geometry.coordinates) {
          if (pointInPolygon(point, polygon[0])) {
            let inHole = false
            for (let i = 1; i < polygon.length; i++) {
              if (pointInPolygon(point, polygon[i])) {
                inHole = true
                break
              }
            }
            if (!inHole) return true
          }
        }
        return false
      }

      return false
    }

    const generateDotsInPolygon = (feature: any, dotSpacing = 16) => {
      const dots: [number, number][] = []
      const bounds = d3.geoBounds(feature)
      const [[minLng, minLat], [maxLng, maxLat]] = bounds

      const stepSize = dotSpacing * 0.08

      for (let lng = minLng; lng <= maxLng; lng += stepSize) {
        for (let lat = minLat; lat <= maxLat; lat += stepSize) {
          const point: [number, number] = [lng, lat]
          if (pointInFeature(point, feature)) {
            dots.push(point)
          }
        }
      }

      return dots
    }

    const allDots: DotData[] = cachedAllDots ? [...cachedAllDots] : [];
    let landFeatures: any = cachedLandFeatures;

    const render = () => {
      context.clearRect(0, 0, containerWidth, containerHeight)

      const currentScale = Math.max(0.1, projection.scale())
      const scaleFactor = Math.max(0.1, currentScale / radius)

      // 1. Back volumetric atmospheric glow mimicking sphere depth (Three.js stylization)
      const gradBg = context.createRadialGradient(
        containerWidth / 2, containerHeight / 2, currentScale * 0.4,
        containerWidth / 2, containerHeight / 2, currentScale
      )
      gradBg.addColorStop(0, "rgba(209, 160, 84, 0.12)")
      gradBg.addColorStop(0.6, "rgba(209, 160, 84, 0.03)")
      gradBg.addColorStop(1, "rgba(0, 0, 0, 0.5)")
      
      context.beginPath()
      context.arc(containerWidth / 2, containerHeight / 2, currentScale, 0, 2 * Math.PI)
      context.fillStyle = gradBg
      context.fill()

      // Subtle atmospheric outline glow
      context.strokeStyle = "rgba(209, 160, 84, 0.25)"
      context.lineWidth = 1.5 * scaleFactor
      context.stroke()

      if (landFeatures) {
        // Graticule lines
        const graticule = d3.geoGraticule()
        context.beginPath()
        path(graticule())
        context.strokeStyle = "rgba(255, 255, 255, 0.04)"
        context.lineWidth = 0.5 * scaleFactor
        context.stroke()

        // Land boundaries
        context.beginPath()
        landFeatures.features.forEach((feature: any) => {
          path(feature)
        })
        context.strokeStyle = "rgba(209, 160, 84, 0.4)"
        context.lineWidth = 1 * scaleFactor
        context.stroke()

        // Land dots - Batched in a single canvas path for 60 FPS performance
        context.beginPath()
        const dotRadius = 1 * scaleFactor
        for (let i = 0; i < allDots.length; i++) {
          const dot = allDots[i]
          const projected = projection([dot.lng, dot.lat])
          if (
            projected &&
            projected[0] >= 0 &&
            projected[0] <= containerWidth &&
            projected[1] >= 0 &&
            projected[1] <= containerHeight
          ) {
            context.moveTo(projected[0] + dotRadius, projected[1])
            context.arc(projected[0], projected[1], dotRadius, 0, 2 * Math.PI)
          }
        }
        context.fillStyle = "rgba(255, 255, 255, 0.45)"
        context.fill()

        // 2. Interactive Pulsing Beacon precisely on Amazonas / Manaus (-60.021731, -3.119027)
        const manausLng = -60.021731
        const manausLat = -3.119027
        const proj = projection([manausLng, manausLat])

        if (proj && proj[0] >= 0 && proj[0] <= containerWidth && proj[1] >= 0 && proj[1] <= containerHeight) {
          const time = Date.now()
          const pulse1 = (Math.sin(time / 240) + 1) / 2 // 0 to 1
          const pulse2 = (Math.sin(time / 150 + Math.PI) + 1) / 2 // staggered

          // Double pulsing ring
          context.beginPath()
          context.arc(proj[0], proj[1], (5 + pulse1 * 12) * scaleFactor, 0, 2 * Math.PI)
          context.strokeStyle = `rgba(209, 160, 84, ${0.4 * (1 - pulse1)})`
          context.lineWidth = 1.5 * scaleFactor
          context.stroke()

          context.beginPath()
          context.arc(proj[0], proj[1], (3 + pulse2 * 8) * scaleFactor, 0, 2 * Math.PI)
          context.strokeStyle = `rgba(209, 160, 84, ${0.5 * (1 - pulse2)})`
          context.lineWidth = 1 * scaleFactor
          context.stroke()

          // Glowing core
          context.beginPath()
          context.arc(proj[0], proj[1], 4.5 * scaleFactor, 0, 2 * Math.PI)
          context.fillStyle = "#D1A054"
          context.fill()
          
          context.beginPath()
          context.arc(proj[0], proj[1], 2 * scaleFactor, 0, 2 * Math.PI)
          context.fillStyle = "#FFFFFF"
          context.fill()
        }
      }
    }

    const loadWorldData = async () => {
      try {
        if (cachedLandFeatures && cachedAllDots) {
           landFeatures = cachedLandFeatures;
           render();
           return;
        }

        if (isFetchingGlobeData && fetchPromise) {
           await fetchPromise;
           landFeatures = cachedLandFeatures;
           cachedAllDots?.forEach(d => allDots.push(d));
           render();
           return;
        }

        isFetchingGlobeData = true;

        fetchPromise = fetch(
          "https://raw.githubusercontent.com/martynafford/natural-earth-geojson/refs/heads/master/110m/physical/ne_110m_land.json",
        ).then(async (response) => {
          if (!response.ok) throw new Error("Failed to load land data")
          const data = await response.json()
          
          // Display land features immediately
          landFeatures = data;
          cachedLandFeatures = data;
          render();
          
          const newDots: DotData[] = [];
          
          await new Promise<void>((resolve) => {
             let idx = 0;
             const processChunk = () => {
                const end = Math.min(idx + 40, data.features.length);
                let addedDots = false;
                for (; idx < end; idx++) {
                  const feature = data.features[idx];
                  const dots = generateDotsInPolygon(feature, 40); // heavily reduce density for speed
                  for(let j=0; j<dots.length; j++) {
                     const dot = { lng: dots[j][0], lat: dots[j][1], visible: true };
                     newDots.push(dot);
                     allDots.push(dot); // pushed dynamically
                     addedDots = true;
                  }
                }
                
                if (addedDots) {
                  render(); // Re-render with new dots
                }

                if (idx < data.features.length) {
                  requestAnimationFrame(processChunk);
                } else {
                  resolve();
                }
             };
             requestAnimationFrame(processChunk);
          });
          
          cachedAllDots = newDots;
        }).catch(err => {
           console.error(err);
           setError("Failed to load land map data");
        }).finally(() => {
           isFetchingGlobeData = false;
        });

        await fetchPromise;
      } catch (err) {
        setError("Failed to load land map data")
      }
    }

    // Interactive inertia and elastic rotation settings
    const rotation: [number, number] = [0, 0]
    let autoRotate = true
    const rotationSpeed = 0.28

    // Interactive mouse parallax variables (Three.js signature)
    let mouseX = 0
    let mouseY = 0
    let targetTiltX = 0
    let targetTiltY = 0
    let currentTiltX = 0
    let currentTiltY = 0

    const handleCanvasMouseMove = (event: MouseEvent) => {
       const rect = canvas.getBoundingClientRect()
       mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1
       mouseY = ((event.clientY - rect.top) / rect.height) * 2 - 1
       targetTiltX = mouseX * 22
       targetTiltY = -mouseY * 12
    }

    const handleCanvasMouseLeave = () => {
       targetTiltX = 0
       targetTiltY = 0
    }

    canvas.addEventListener("mousemove", handleCanvasMouseMove)
    canvas.addEventListener("mouseleave", handleCanvasMouseLeave)

    // Animation Tick Loop replacing d3.timer for precise requestAnimationFrame optimization
    let isTerminated = false
    const tick = () => {
      if (isTerminated) return

      if (autoRotate) {
        rotation[0] += rotationSpeed
      }

      // Smooth Lerp Spring interpolation
      currentTiltX += (targetTiltX - currentTiltX) * 0.08
      currentTiltY += (targetTiltY - currentTiltY) * 0.08

      const finalRotation: [number, number] = [
        rotation[0] + currentTiltX,
        rotation[1] + currentTiltY
      ]

      projection.rotate(finalRotation)
      render()

      requestAnimationFrame(tick)
    }

    // Start tick loop
    requestAnimationFrame(tick)

    const handleMouseDown = (event: MouseEvent) => {
      autoRotate = false
      const startX = event.clientX
      const startY = event.clientY
      const startRotation = [...rotation]

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const sensitivity = 0.4
        const dx = moveEvent.clientX - startX
        const dy = moveEvent.clientY - startY

        rotation[0] = startRotation[0] + dx * sensitivity
        rotation[1] = startRotation[1] - dy * sensitivity
        rotation[1] = Math.max(-90, Math.min(90, rotation[1]))
      }

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)

        setTimeout(() => {
          autoRotate = true
        }, 4000)
      }

      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    canvas.addEventListener("mousedown", handleMouseDown)

    loadWorldData()

    return () => {
      isTerminated = true
      canvas.removeEventListener("mousedown", handleMouseDown)
      canvas.removeEventListener("mousemove", handleCanvasMouseMove)
      canvas.removeEventListener("mouseleave", handleCanvasMouseLeave)
    }
  }, [width, height])

  if (error) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <p className="text-red-400 font-semibold mb-2">Error loading Earth</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <canvas
        ref={canvasRef}
        className="max-w-full h-auto cursor-grab active:cursor-grabbing [will-change:transform] [transform:translateZ(0)]"
      />
    </div>
  )
}
