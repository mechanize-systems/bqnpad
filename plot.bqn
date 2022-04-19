# Plots

## Low-level ot.Plot API

{ x0←↕15,
  •plot.Plot {
    marks⇐⟨
      {type⇐"line"⋄x⇐↕15⋄y⇐↕15}
      {type⇐"dot"⋄x⇐x0⋄y⇐x0⋄fill⇐<"red"} # faceted
      {type⇐"frame"}
    ⟩
    facet⇐{data⇐x0⋄x⇐2|data⋄y⇐3|data}
  }
},

## Line plots

Line←{
   𝕊y: (↕∘⊑∘⌽≢)⊸𝕊y;
  x𝕊y:
    marks←{
      1:   <{type⇐"line",x⇐x,y⇐y};
      2:(↕∘≠{type⇐"line",x⇐x,y⇐𝕩,stroke⇐𝕨}˘⊢)y;
      "•plot.Line: 𝕩 must be 0-rank or 1-rank array"!0
    }=y
    •plot.Plot {marks⇐{type⇐"frame"}∾marks},y
},

x←0.1×↕250
cos←•math.Cos x
sin←•math.Sin x,

x Line (1.5×cos)∾sin∾cos≍sin×cos,
Line •math.Cos¨((1+↕5)×⌜0.025×↕100)

# Bar plots

BarY←{x𝕊y:
  marks←{type⇐"bary",x⇐x,y⇐y}
  •plot.Plot {marks⇐{type⇐"frame"}∾marks}
  x
}
BarX←{y𝕊x:
  marks←{type⇐"barx",x⇐x,y⇐y}
  •plot.Plot {marks⇐{type⇐"frame"}∾marks}
  x
},

"ABC" BarY 2‿4‿20,
"ABC" BarX 2‿4‿20,
