import { ContentLayout } from "@/components/layouts/ContentLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Mic2, 
  Play, 
  Pause, 
  Volume2, 
  Settings, 
  Plus,
  Heart,
  Download,
  AudioWaveform,
  User,
  Crown,
  Zap
} from "lucide-react";
import { useState } from "react";

const VoiceStudio = () => {
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  
  // Mock voice personas data (in production, this would come from your voice personas API)
  const voicePersonas = [
    {
      id: "default",
      name: "Clara",
      type: "Neural Voice",
      gender: "Female",
      accent: "American",
      description: "Warm and professional voice perfect for educational content and long reading sessions.",
      isPremium: false,
      isPopular: true,
      rating: 4.8,
      downloads: 15420,
      previewText: "Welcome to ReadAI. This is Clara, your AI reading companion.",
      settings: {
        speed: [1.0],
        pitch: [1.0],
        emotion: "neutral"
      },
      tags: ["Professional", "Warm", "Clear"]
    },
    {
      id: "marcus",
      name: "Marcus",
      type: "Premium Voice",
      gender: "Male",
      accent: "British",
      description: "Distinguished British accent ideal for literature, academic papers, and professional documents.",
      isPremium: true,
      isPopular: false,
      rating: 4.9,
      downloads: 8932,
      previewText: "Good day! I'm Marcus, and I'll be narrating your documents with precision and clarity.",
      settings: {
        speed: [0.9],
        pitch: [0.8],
        emotion: "authoritative"
      },
      tags: ["British", "Distinguished", "Academic"]
    },
    {
      id: "aria",
      name: "Aria",
      type: "AI Voice",
      gender: "Female",
      accent: "Neutral",
      description: "Expressive and dynamic voice that adapts to content mood and reading context automatically.",
      isPremium: true,
      isPopular: true,
      rating: 4.7,
      downloads: 12108,
      previewText: "Hi there! I'm Aria, and I can adjust my tone to match what you're reading.",
      settings: {
        speed: [1.1],
        pitch: [1.2],
        emotion: "adaptive"
      },
      tags: ["Adaptive", "Expressive", "Smart"]
    },
    {
      id: "james",
      name: "James",
      type: "Neural Voice",
      gender: "Male",
      accent: "American",
      description: "Deep, calm voice excellent for relaxation, meditation content, and bedtime reading.",
      isPremium: false,
      isPopular: false,
      rating: 4.6,
      downloads: 6547,
      previewText: "Hello, I'm James. Let me help you unwind with a soothing reading experience.",
      settings: {
        speed: [0.8],
        pitch: [0.7],
        emotion: "calm"
      },
      tags: ["Calm", "Deep", "Relaxing"]
    }
  ];

  const [selectedVoice, setSelectedVoice] = useState(voicePersonas[0]);

  const handlePlayPreview = (voiceId: string) => {
    if (currentlyPlaying === voiceId) {
      setCurrentlyPlaying(null);
    } else {
      setCurrentlyPlaying(voiceId);
      // In a real app, this would play the actual voice preview
      setTimeout(() => setCurrentlyPlaying(null), 3000); // Simulate 3-second preview
    }
  };

  const updateVoiceSetting = (setting: string, value: any) => {
    setSelectedVoice(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [setting]: value
      }
    }));
  };

  return (
    <ContentLayout
      title="Voice Studio"
      description="Manage and customize your reading voices"
    >
      <div className="space-y-8">
        {/* Voice Gallery */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">Voice Gallery</h2>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Request New Voice
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {voicePersonas.map((voice) => (
              <Card 
                key={voice.id}
                className={`glass transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer ${
                  selectedVoice.id === voice.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedVoice(voice)}
              >
                <div className="p-4 space-y-4">
                  {/* Voice Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center">
                        {voice.gender === 'Female' ? (
                          <User className="h-6 w-6 text-primary" />
                        ) : (
                          <User className="h-6 w-6 text-primary" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-foreground">{voice.name}</h3>
                          {voice.isPremium && (
                            <Crown className="h-4 w-4 text-yellow-500" />
                          )}
                          {voice.isPopular && (
                            <Badge variant="secondary" className="text-xs">
                              <Zap className="h-3 w-3 mr-1" />
                              Popular
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {voice.gender} • {voice.accent}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Voice Description */}
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {voice.description}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {voice.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center space-x-3">
                      <span>★ {voice.rating}</span>
                      <span>{voice.downloads.toLocaleString()} users</span>
                    </div>
                    <Badge variant={voice.isPremium ? "default" : "secondary"} className="text-xs">
                      {voice.isPremium ? "Premium" : "Free"}
                    </Badge>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1 gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayPreview(voice.id);
                      }}
                    >
                      {currentlyPlaying === voice.id ? (
                        <Pause className="h-3 w-3" />
                      ) : (
                        <Play className="h-3 w-3" />
                      )}
                      Preview
                    </Button>
                    <Button size="sm" variant="outline">
                      <Heart className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Voice Customization */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Selected Voice Details */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-foreground">Voice Details</h2>
            
            <Card className="glass p-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold text-foreground">{selectedVoice.name}</h3>
                      {selectedVoice.isPremium && (
                        <Crown className="h-5 w-5 text-yellow-500" />
                      )}
                    </div>
                    <p className="text-muted-foreground">{selectedVoice.type}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedVoice.gender} • {selectedVoice.accent}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  {selectedVoice.description}
                </p>

                <div className="flex flex-wrap gap-2">
                  {selectedVoice.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="pt-4">
                  <Button 
                    className="w-full gap-2"
                    onClick={() => handlePlayPreview(selectedVoice.id)}
                  >
                    {currentlyPlaying === selectedVoice.id ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    {currentlyPlaying === selectedVoice.id ? 'Stop Preview' : 'Play Preview'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Voice Settings */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-foreground">Voice Settings</h2>
            
            <Card className="glass p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label htmlFor="speed">
                    Speech Speed: {selectedVoice.settings.speed[0]}x
                  </Label>
                  <Slider
                    id="speed"
                    min={0.5}
                    max={2.0}
                    step={0.1}
                    value={selectedVoice.settings.speed}
                    onValueChange={(value) => updateVoiceSetting('speed', value)}
                    className="w-full"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="pitch">
                    Voice Pitch: {selectedVoice.settings.pitch[0]}
                  </Label>
                  <Slider
                    id="pitch"
                    min={0.5}
                    max={1.5}
                    step={0.1}
                    value={selectedVoice.settings.pitch}
                    onValueChange={(value) => updateVoiceSetting('pitch', value)}
                    className="w-full"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="emotion">Voice Emotion</Label>
                  <Select 
                    value={selectedVoice.settings.emotion} 
                    onValueChange={(value) => updateVoiceSetting('emotion', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="neutral">Neutral</SelectItem>
                      <SelectItem value="warm">Warm</SelectItem>
                      <SelectItem value="authoritative">Authoritative</SelectItem>
                      <SelectItem value="calm">Calm</SelectItem>
                      <SelectItem value="adaptive">Adaptive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1 gap-2">
                  <Play className="h-4 w-4" />
                  Test Settings
                </Button>
                <Button className="flex-1">
                  Save as Default
                </Button>
              </div>
            </Card>

            {/* Voice Statistics */}
            <Card className="glass p-6">
              <h3 className="font-semibold text-foreground mb-4">Usage Statistics</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total listening time</span>
                  <span className="text-foreground">12h 34m</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Books read with this voice</span>
                  <span className="text-foreground">7</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Average session length</span>
                  <span className="text-foreground">45 minutes</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Preferred reading speed</span>
                  <span className="text-foreground">1.2x</span>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Coming Soon Features */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-6">Coming Soon</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="glass p-6 text-center">
              <AudioWaveform className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-foreground mb-2">Voice Cloning</h3>
              <p className="text-sm text-muted-foreground">
                Create custom voices using AI voice cloning technology
              </p>
            </Card>

            <Card className="glass p-6 text-center">
              <Volume2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-foreground mb-2">Emotion Detection</h3>
              <p className="text-sm text-muted-foreground">
                Automatically adjust voice emotion based on content context
              </p>
            </Card>

            <Card className="glass p-6 text-center">
              <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-foreground mb-2">Advanced Controls</h3>
              <p className="text-sm text-muted-foreground">
                Fine-tune breathing, pauses, and pronunciation patterns
              </p>
            </Card>
          </div>
        </section>
      </div>
    </ContentLayout>
  );
};

export default VoiceStudio;
