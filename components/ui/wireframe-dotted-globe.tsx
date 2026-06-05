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

    // Set up responsive dimensions
    const containerWidth = Math.max(10, Math.min(width, window.innerWidth - 40))
    const containerHeight = Math.max(10, Math.min(height, window.innerHeight - 100))
    const radius = Math.max(1, Math.min(containerWidth, containerHeight) / 2.5)

    const dpr = window.devicePixelRatio || 1
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

      context.beginPath()
      context.arc(containerWidth / 2, containerHeight / 2, currentScale, 0, 2 * Math.PI)
      context.fillStyle = "transparent"
      context.fill()
      context.strokeStyle = "rgba(0, 245, 255, 0.2)"
      context.lineWidth = 1 * scaleFactor
      context.stroke()

      if (landFeatures) {
        const graticule = d3.geoGraticule()
        context.beginPath()
        path(graticule())
        context.strokeStyle = "rgba(255,255,255,0.05)"
        context.lineWidth = 1 * scaleFactor
        context.stroke()

        context.beginPath()
        landFeatures.features.forEach((feature: any) => {
          path(feature)
        })
        context.strokeStyle = "rgba(0, 245, 255, 0.4)"
        context.lineWidth = 1 * scaleFactor
        context.stroke()

        allDots.forEach((dot) => {
          const projected = projection([dot.lng, dot.lat])
          if (
            projected &&
            projected[0] >= 0 &&
            projected[0] <= containerWidth &&
            projected[1] >= 0 &&
            projected[1] <= containerHeight
          ) {
            context.beginPath()
            context.arc(projected[0], projected[1], 1 * scaleFactor, 0, 2 * Math.PI)
            context.fillStyle = "rgba(255, 255, 255, 0.3)"
            context.fill()
          }
        })
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

    const rotation: [number, number] = [0, 0]
    let autoRotate = true
    const rotationSpeed = 0.3

    const rotate = () => {
      if (autoRotate) {
        rotation[0] += rotationSpeed
        projection.rotate(rotation)
        render()
      }
    }

    const rotationTimer = d3.timer(rotate)

    const handleMouseDown = (event: MouseEvent) => {
      autoRotate = false
      const startX = event.clientX
      const startY = event.clientY
      const startRotation = [...rotation]

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const sensitivity = 0.5
        const dx = moveEvent.clientX - startX
        const dy = moveEvent.clientY - startY

        rotation[0] = startRotation[0] + dx * sensitivity
        rotation[1] = startRotation[1] - dy * sensitivity
        rotation[1] = Math.max(-90, Math.min(90, rotation[1]))

        projection.rotate(rotation)
        render()
      }

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)

        setTimeout(() => {
          autoRotate = true
        }, 3000)
      }

      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    canvas.addEventListener("mousedown", handleMouseDown)

    loadWorldData()

    return () => {
      rotationTimer.stop()
      canvas.removeEventListener("mousedown", handleMouseDown)
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
        className="max-w-full h-auto cursor-grab active:cursor-grabbing"
      />
    </div>
  )
}
