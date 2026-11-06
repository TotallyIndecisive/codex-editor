import Foundation
import AVFoundation
import AppKit
import QuartzCore

let root=URL(fileURLWithPath:CommandLine.arguments[1],isDirectory:true)
let out=URL(fileURLWithPath:CommandLine.arguments[2])
struct Field: Decodable { let v: Value }
enum Value: Decodable {
 case string(String), number(Double)
 init(from decoder: Decoder) throws { let c=try decoder.singleValueContainer(); if let s=try? c.decode(String.self){self = .string(s)}else{self = .number(try c.decode(Double.self))} }
}
struct Element: Decodable {let t:[Double];let box:[Double];let props:[String:Field]}
struct Scene: Decodable {let els:[Element]}
struct Token: Decodable {let v:String}
struct Brand: Decodable {let colors:[Token];let fonts:[Token];let logo:String?}
struct Audio: Decodable {let music:String?;let musicVol:Double;let sfxVol:Double}
struct Reel: Decodable {let scenes:[Scene];let brand:Brand;let audio:Audio}
let reel=try JSONDecoder().decode(Reel.self,from:Data(contentsOf:URL(fileURLWithPath:CommandLine.arguments[3])))
let primary=UInt(reel.brand.colors[0].v.dropFirst(),radix:16)!
let accentHex=UInt(reel.brand.colors[1].v.dropFirst(),radix:16)!

let comp=AVMutableComposition()
let v=comp.addMutableTrack(withMediaType:.video,preferredTrackID:kCMPersistentTrackID_Invalid)!
let audio=comp.addMutableTrack(withMediaType:.audio,preferredTrackID:kCMPersistentTrackID_Invalid)!
func t(_ s:Double)->CMTime { CMTime(seconds:s,preferredTimescale:600) }
let a1=AVURLAsset(url:root.appendingPathComponent("intro.mp3")), a2=AVURLAsset(url:root.appendingPathComponent("final.mp3"))
let first=AVURLAsset(url:root.appendingPathComponent("test1.mp4")), second=AVURLAsset(url:root.appendingPathComponent("test2.mp4"))
let intro=13.64, duration=44.18
try audio.insertTimeRange(CMTimeRange(start:.zero,duration:t(13.635)),of:a1.tracks(withMediaType:.audio)[0],at:.zero)
try audio.insertTimeRange(CMTimeRange(start:.zero,duration:t(30.535)),of:a2.tracks(withMediaType:.audio)[0],at:t(intro))
// Timeline: destination start/end and source time. Cuts follow the recorded narration.
let edits:[(Double,Double,AVURLAsset,Double)] = [
 (0,13.64,first,0), (13.64,18.86,second,5), (18.86,21.44,second,18),
 (21.44,25.36,second,30), (25.36,27.56,second,38), (27.56,30.76,second,42),
 (30.76,34.36,second,71), (34.36,36.10,second,53), (36.10,39.88,second,60),
 (39.88,42.66,second,30), (42.66,44.18,second,78)]
for (start,end,asset,src) in edits {try v.insertTimeRange(CMTimeRange(start:t(src),duration:t(end-start)),of:asset.tracks(withMediaType:.video)[0],at:t(start))}
let W:CGFloat=1920,H:CGFloat=1080
let videoComp=AVMutableVideoComposition();videoComp.renderSize=CGSize(width:W,height:H);videoComp.frameDuration=CMTime(value:1,timescale:30)
let instruction=AVMutableVideoCompositionInstruction();instruction.timeRange=CMTimeRange(start:.zero,duration:t(duration))
let li=AVMutableVideoCompositionLayerInstruction(assetTrack:v)
// The native recording fills the canvas behind the moving editorial panels.
li.setTransform(CGAffineTransform(scaleX:1.10,y:1.10).translatedBy(x:-87,y:-49),at:.zero)
instruction.layerInstructions=[li];videoComp.instructions=[instruction]
let rootLayer=CALayer();rootLayer.frame=CGRect(x:0,y:0,width:W,height:H);rootLayer.backgroundColor=NSColor(calibratedWhite:0.045,alpha:1).cgColor
let videoLayer=CALayer();videoLayer.frame=rootLayer.bounds;rootLayer.addSublayer(videoLayer)
func color(_ hex:UInt, _ alpha:CGFloat=1)->CGColor { NSColor(calibratedRed:CGFloat((hex>>16)&255)/255,green:CGFloat((hex>>8)&255)/255,blue:CGFloat(hex&255)/255,alpha:alpha).cgColor }
func panel(_ x:CGFloat,_ y:CGFloat,_ w:CGFloat,_ h:CGFloat,_ fill:CGColor,_ radius:CGFloat)->CALayer {let l=CALayer();l.frame=CGRect(x:x,y:y,width:w,height:h);l.backgroundColor=fill;l.cornerRadius=radius;rootLayer.addSublayer(l);return l}
func text(_ str:String,_ x:CGFloat,_ y:CGFloat,_ w:CGFloat,_ h:CGFloat,_ size:CGFloat,_ c:CGColor,_ weight:NSFont.Weight)->CALayer {
 let img=NSImage(size:NSSize(width:w,height:h));img.lockFocus()
 let attrs:[NSAttributedString.Key:Any] = [.font:(NSFont(name:reel.brand.fonts[0].v,size:size) ?? NSFont.systemFont(ofSize:size,weight:weight)),.foregroundColor:NSColor(cgColor:c)!]
 (str as NSString).draw(at:NSPoint(x:0,y:0),withAttributes:attrs)
 img.unlockFocus()
 let l=CALayer();l.frame=CGRect(x:x,y:y,width:w,height:h);l.contents=img.cgImage(forProposedRect:nil,context:nil,hints:nil);l.contentsGravity = .resize;rootLayer.addSublayer(l);return l
}
func visible(_ layer:CALayer,_ start:Double,_ end:Double) {
 layer.opacity=0
 let a=CAKeyframeAnimation(keyPath:"opacity");a.values=[0,1,1,0];let span=end-start;let rise=min(0.22,span/4),fall=min(0.18,span/4);a.keyTimes=[0,NSNumber(value:rise/span),NSNumber(value:(span-fall)/span),1];a.duration=span;a.beginTime=AVCoreAnimationBeginTimeAtZero+start;a.fillMode = .both;a.isRemovedOnCompletion=false;layer.add(a,forKey:"reveal")
 let p=CABasicAnimation(keyPath:"transform.translation.y");p.fromValue = -16;p.toValue=0;p.duration=0.35;p.beginTime=AVCoreAnimationBeginTimeAtZero+start;p.timingFunction=CAMediaTimingFunction(name:.easeOut);p.fillMode = .both;p.isRemovedOnCompletion=false;layer.add(p,forKey:"motion")
}
// Header: compact title treatment deliberately leaves the center of the product recording clear.
let header=panel(70,956,650,75,color(primary,0.94),16);visible(header,0.15,44.0)
let accent=panel(70,956,10,75,color(accentHex),4);visible(accent,0.15,44.0)
let label=text("OPENPLATFORM  /  IDE",103,975,565,40,30,color(0xffffff),.bold);visible(label,0.15,44.0)
// Narration-aligned chapter cards and concise supporting text.
for scene in reel.scenes {
 if let e=scene.els.first {visible(panel(70,60,1060,138,color(primary,0.96),20),e.t[0],e.t[1])}
 for el in scene.els {
  guard case let .string(copy)?=el.props["copy"]?.v, case let .number(size)?=el.props["size"]?.v else {continue}
  let b=el.box
  let caption=text(copy, W*b[0]/100,H*(100-b[1]-b[3])/100,W*b[2]/100,H*b[3]/100,size,color(0xffffff),.bold)
  visible(caption,el.t[0],el.t[1])
 }
}
if CommandLine.arguments.count>5, let image=NSImage(contentsOfFile:CommandLine.arguments[5]) {
 let mark=CALayer(); mark.frame=CGRect(x:1670,y:75,width:158,height:92)
 mark.contents=image.cgImage(forProposedRect:nil,context:nil,hints:nil);mark.contentsGravity = .resizeAspect
 rootLayer.addSublayer(mark)
}
let voice=AVMutableAudioMixInputParameters(track:audio)
voice.setVolume(Float(reel.audio.sfxVol),at:.zero)
var levels=[voice]
if CommandLine.arguments.count>4, CommandLine.arguments[4] != "-" {
 let asset=AVURLAsset(url:URL(fileURLWithPath:CommandLine.arguments[4]))
 guard let source=asset.tracks(withMediaType:.audio).first else {throw NSError(domain:"Invalid music file",code:1)}
 let track=comp.addMutableTrack(withMediaType:.audio,preferredTrackID:kCMPersistentTrackID_Invalid)!
 try track.insertTimeRange(CMTimeRange(start:.zero,duration:CMTimeMinimum(asset.duration,t(duration))),of:source,at:.zero)
 let level=AVMutableAudioMixInputParameters(track:track);level.setVolume(Float(reel.audio.musicVol),at:.zero);levels.append(level)
}
let mix=AVMutableAudioMix();mix.inputParameters=levels
videoComp.animationTool=AVVideoCompositionCoreAnimationTool(postProcessingAsVideoLayer:videoLayer,in:rootLayer)
try? FileManager.default.removeItem(at:out)
let exp=AVAssetExportSession(asset:comp,presetName:AVAssetExportPresetHighestQuality)!
exp.outputURL=out;exp.outputFileType = .mp4;exp.shouldOptimizeForNetworkUse=true;exp.videoComposition=videoComp;exp.audioMix=mix
let sem=DispatchSemaphore(value:0);exp.exportAsynchronously{sem.signal()};sem.wait()
print("status",exp.status.rawValue,"error",exp.error?.localizedDescription ?? "none", "file",out.path)
if exp.status != .completed {exit(1)}
