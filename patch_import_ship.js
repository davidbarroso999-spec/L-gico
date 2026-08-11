const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');
code = code.replace(
  "import { MapPin, Target, Sparkles, Box, Anchor, Navigation, Calendar, Clock, Navigation2, Layers, Globe2, Gauge, AlertCircle, X, Maximize2, MoreVertical, Menu, Info, Share2, Compass, Waves, CloudLightning, FileText, Camera, Eye, UploadCloud, FileCheck, ShoppingBag, Truck, CheckCircle2, RotateCcw } from 'lucide-react';",
  "import { MapPin, Target, Sparkles, Box, Anchor, Navigation, Calendar, Clock, Navigation2, Layers, Globe2, Gauge, AlertCircle, X, Maximize2, MoreVertical, Menu, Info, Share2, Compass, Waves, CloudLightning, FileText, Camera, Eye, UploadCloud, FileCheck, ShoppingBag, Truck, CheckCircle2, RotateCcw, Ship } from 'lucide-react';"
);
fs.writeFileSync('app/page.tsx', code);
