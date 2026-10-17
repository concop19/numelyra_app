import bpy
import math
import random
from pathlib import Path
from mathutils import Vector


OUTPUT_DIR = Path(r"C:\Users\Admin\.gemini\antigravity\scratch\NumerologyWebApp\mobile_app\artifacts")
BLEND_PATH = OUTPUT_DIR / "lang_viet_reference_style.blend"
RENDER_PATH = OUTPUT_DIR / "lang_viet_reference_style.png"

random.seed(1508)


def world(x, z, h=0.0):
    return (float(x), float(-z), float(h))


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for blocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for block in list(blocks):
            if block.users == 0:
                blocks.remove(block)


def mat(name, color, roughness=0.8, emission=None, strength=0.0):
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    material.diffuse_color = (*color[:3], 1.0)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color[:3], 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    if emission:
        socket = bsdf.inputs.get("Emission Color") or bsdf.inputs.get("Emission")
        if socket:
            socket.default_value = (*emission[:3], 1.0)
        power = bsdf.inputs.get("Emission Strength")
        if power:
            power.default_value = strength
    return material


def finish(obj, material, bevel=0.0):
    if obj.data and hasattr(obj.data, "materials"):
        obj.data.materials.append(material)
    if bevel:
        modifier = obj.modifiers.new("Illustrated bevel", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
    return obj


def box(name, x, z, width, depth, height, material, base=0.0, angle=0.0, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(
        location=world(x, z, base + height / 2),
        rotation=(0.0, 0.0, math.radians(angle)),
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = (width / 2, depth / 2, height / 2)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, material, bevel)


def cylinder(name, x, z, radius, height, material, base=0.0, vertices=16):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=height,
        location=world(x, z, base + height / 2),
    )
    obj = bpy.context.object
    obj.name = name
    return finish(obj, material)


def sphere(name, x, z, radius, material, height, scale=(1.0, 1.0, 1.0), subdivisions=2):
    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=subdivisions,
        radius=radius,
        location=world(x, z, height),
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    finish(obj, material)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def ribbon(name, points, width, material, height=0.45):
    pts = [Vector(world(x, z, height)) for x, z in points]
    verts = []
    for index, point in enumerate(pts):
        before = pts[index - 1] if index else point
        after = pts[index + 1] if index < len(pts) - 1 else point
        direction = Vector((after.x - before.x, after.y - before.y, 0.0))
        if direction.length == 0:
            direction = Vector((1.0, 0.0, 0.0))
        direction.normalize()
        offset = Vector((-direction.y, direction.x, 0.0)) * width / 2
        verts.extend((tuple(point + offset), tuple(point - offset)))
    faces = [(i * 2, (i + 1) * 2, (i + 1) * 2 + 1, i * 2 + 1) for i in range(len(pts) - 1)]
    mesh = bpy.data.meshes.new(name + " Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    finish(obj, material)
    bevel = obj.modifiers.new("Soft path edge", "BEVEL")
    bevel.width = 0.45
    bevel.segments = 2
    return obj


def gable_roof(name, x, z, width, depth, base, roof_height, material, angle=0.0):
    half_w = width / 2
    half_d = depth / 2
    vertices = [
        (-half_w, -half_d, 0), (half_w, -half_d, 0), (0, -half_d, roof_height),
        (-half_w, half_d, 0), (half_w, half_d, 0), (0, half_d, roof_height),
    ]
    faces = [(0, 1, 4, 3), (0, 2, 5, 3), (2, 1, 4, 5), (0, 1, 2), (3, 5, 4)]
    mesh = bpy.data.meshes.new(name + " Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = world(x, z, base)
    obj.rotation_euler.z = math.radians(angle)
    bpy.context.collection.objects.link(obj)
    return finish(obj, material, 0.5)


def tiled_house(name, x, z, width=22, depth=13, angle=0, wall=None, roof=None, veranda=True):
    wall = wall or M["plaster"]
    roof = roof or M["roof"]
    box(name + " Body", x, z, width, depth, 8.5, wall, base=0.6, angle=angle, bevel=0.45)
    gable_roof(name + " Roof", x, z, width + 4, depth + 4, 9.1, 5.2, roof, angle)
    # Roof ridge and raised end caps echo traditional Vietnamese tile roofs.
    box(name + " Ridge", x, z, 1.0, depth + 4.5, 0.75, M["roof_dark"], base=14.0, angle=angle, bevel=0.25)
    for side in (-1, 1):
        box(name + f" Roof finial {side}", x + side * width * 0.51, z, 0.85, depth + 4.8, 1.0, M["roof_dark"], base=9.7, angle=angle, bevel=0.25)
    if veranda:
        # Veranda is placed along the south-facing edge in map space.
        box(name + " Veranda", x, z + depth * 0.58, width * 0.9, 3.3, 0.55, M["stone"], base=0.65, angle=angle, bevel=0.25)
        for offset in (-width * 0.32, 0, width * 0.32):
            cylinder(name + " Column", x + offset, z + depth * 0.68, 0.35, 6.8, M["wood_dark"], base=1.0, vertices=10)
    box(name + " Door", x, z + depth * 0.51, 3.2, 0.4, 5.0, M["wood_dark"], base=0.65, angle=angle)


def temple(name, x, z):
    box(name + " Courtyard", x, z + 8, 58, 40, 0.55, M["courtyard"], base=0.5, bevel=1.5)
    tiled_house(name + " Main Hall", x, z - 3, width=38, depth=20, wall=M["temple_red"], roof=M["roof_dark"])
    for offset in (-14, -7, 0, 7, 14):
        cylinder(name + " Red column", x + offset, z + 9, 0.55, 8.0, M["temple_red"], base=1.1, vertices=12)
    for step in range(3):
        box(name + f" Step {step}", x, z + 20 + step * 2.2, 31 - step * 3, 2.5, 0.55, M["stone"], base=0.5 + step * 0.45, bevel=0.2)
    # Compact gate and stone posts.
    for side in (-1, 1):
        box(name + " Gate post", x + side * 7, z + 28, 2.3, 2.3, 6.5, M["temple_red"], base=0.6, bevel=0.25)
        cylinder(name + " Stone lantern", x + side * 13, z + 24, 1.0, 4.5, M["stone"], base=0.6, vertices=8)
    gable_roof(name + " Gate roof", x, z + 28, 19, 6, 7.1, 3.2, M["roof"])


def tree(name, x, z, radius=5.0, trunk=6.5, palette=0):
    cylinder(name + " Trunk", x, z, max(0.55, radius * 0.17), trunk, M["trunk"], base=0.6, vertices=12)
    leaves = [M["leaf_mid"], M["leaf_light"], M["leaf_dark"]]
    main = leaves[palette % 3]
    sphere(name + " Crown A", x, z, radius, main, trunk + 2.3, scale=(1.0, 0.88, 0.72))
    sphere(name + " Crown B", x - radius * 0.55, z + 0.5, radius * 0.68, leaves[(palette + 1) % 3], trunk + 2.4, scale=(1.0, 0.9, 0.72))
    sphere(name + " Crown C", x + radius * 0.52, z - 0.3, radius * 0.72, leaves[(palette + 2) % 3], trunk + 2.2, scale=(1.0, 0.92, 0.7))


def palm(name, x, z, height=11.0):
    cylinder(name + " Trunk", x, z, 0.62, height, M["palm_trunk"], base=0.5, vertices=10)
    for index in range(8):
        angle = index * 45
        radians = math.radians(angle)
        px = x + math.cos(radians) * 3.2
        pz = z + math.sin(radians) * 3.2
        frond = sphere(name + f" Frond {index}", px, pz, 2.8, M["palm"], height + 0.7, scale=(0.34, 1.65, 0.18), subdivisions=1)
        frond.rotation_euler.z = -radians


def pond(name, x, z, width, depth):
    sphere(name + " Bank", x, z, 1.0, M["mud"], 0.55, scale=(width / 1.8, depth / 1.8, 0.22), subdivisions=3)
    sphere(name + " Water", x, z, 1.0, M["water"], 0.8, scale=(width / 2.0, depth / 2.0, 0.18), subdivisions=3)
    for index in range(22):
        theta = random.random() * math.tau
        rad = math.sqrt(random.random())
        px = x + math.cos(theta) * width * 0.38 * rad
        pz = z + math.sin(theta) * depth * 0.38 * rad
        cylinder(name + f" Lotus pad {index}", px, pz, 0.75 + random.random() * 0.45, 0.12, M["lotus_leaf"], base=1.02, vertices=14)
        if index % 5 == 0:
            sphere(name + f" Lotus flower {index}", px, pz, 0.45, M["lotus"], 1.45, scale=(1.0, 1.0, 0.65), subdivisions=2)


def garden(name, x, z, width, depth, rows=5, angle=0):
    box(name + " Soil", x, z, width, depth, 0.35, M["soil"], base=0.45, angle=angle, bevel=0.8)
    spacing = depth / (rows + 1)
    for row in range(rows):
        row_z = z - depth / 2 + spacing * (row + 1)
        box(name + f" Crop row {row}", x, row_z, width * 0.86, 1.15, 0.65, [M["crop_a"], M["crop_b"], M["crop_c"]][row % 3], base=0.83, angle=angle, bevel=0.3)


def rice_field(name, x, z, width, depth, color, angle=0):
    box(name, x, z, width, depth, 0.38, color, base=0.38, angle=angle, bevel=1.1)
    count = max(3, int(depth / 6))
    for index in range(count):
        row_z = z - depth / 2 + (index + 1) * depth / (count + 1)
        box(name + f" Furrow {index}", x, row_z, width * 0.9, 0.55, 0.18, M["field_edge"], base=0.82, angle=angle)


def market_stall(name, x, z, canopy):
    box(name + " Counter", x, z, 7.5, 4.5, 2.0, M["wood"], base=0.6, bevel=0.25)
    for dx in (-3.0, 3.0):
        for dz in (-1.5, 1.5):
            cylinder(name + " Pole", x + dx, z + dz, 0.18, 5.5, M["wood_dark"], base=0.6, vertices=8)
    box(name + " Awning", x, z, 8.5, 5.5, 0.45, canopy, base=5.9, bevel=0.2)


def stone_well(name, x, z):
    cylinder(name + " Ring", x, z, 4.0, 2.2, M["stone"], base=0.6, vertices=24)
    cylinder(name + " Water", x, z, 2.8, 0.18, M["water"], base=2.75, vertices=24)
    for dx in (-4.4, 4.4):
        cylinder(name + " Post", x + dx, z, 0.28, 7.0, M["wood_dark"], base=0.6, vertices=8)
    box(name + " Beam", x, z, 10, 0.55, 0.55, M["wood_dark"], base=7.1, bevel=0.2)


clear_scene()
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

M = {
    "ground": mat("Illustrated warm grass", (0.54, 0.66, 0.28)),
    "field_a": mat("Young rice", (0.39, 0.63, 0.22)),
    "field_b": mat("Golden green rice", (0.63, 0.70, 0.28)),
    "field_c": mat("Deep rice field", (0.28, 0.53, 0.20)),
    "field_edge": mat("Field furrow", (0.31, 0.38, 0.17)),
    "road": mat("Warm village earth", (0.72, 0.55, 0.31)),
    "road_edge": mat("Packed earth edge", (0.47, 0.37, 0.20)),
    "courtyard": mat("Sunlit courtyard", (0.70, 0.64, 0.50)),
    "roof": mat("Orange terracotta", (0.72, 0.24, 0.10)),
    "roof_dark": mat("Deep terracotta", (0.40, 0.09, 0.04)),
    "plaster": mat("Warm plaster", (0.86, 0.72, 0.51)),
    "plaster_light": mat("Light plaster", (0.94, 0.82, 0.59)),
    "temple_red": mat("Temple vermilion", (0.55, 0.07, 0.035)),
    "wood": mat("Weathered timber", (0.43, 0.24, 0.09)),
    "wood_dark": mat("Dark timber", (0.19, 0.075, 0.025)),
    "stone": mat("Warm gray stone", (0.46, 0.48, 0.42)),
    "trunk": mat("Tree bark", (0.24, 0.13, 0.045)),
    "leaf_light": mat("Leaf highlight", (0.39, 0.65, 0.20)),
    "leaf_mid": mat("Leaf green", (0.20, 0.48, 0.15)),
    "leaf_dark": mat("Leaf shadow", (0.08, 0.29, 0.10)),
    "palm": mat("Palm green", (0.17, 0.46, 0.16)),
    "palm_trunk": mat("Palm trunk", (0.44, 0.28, 0.10)),
    "mud": mat("Pond bank", (0.38, 0.34, 0.18)),
    "water": mat("Lotus pond water", (0.18, 0.56, 0.60), roughness=0.34),
    "lotus_leaf": mat("Lotus leaf", (0.23, 0.54, 0.26)),
    "lotus": mat("Lotus pink", (0.95, 0.43, 0.54), roughness=0.62),
    "soil": mat("Garden soil", (0.35, 0.20, 0.09)),
    "crop_a": mat("Vegetable green", (0.21, 0.56, 0.15)),
    "crop_b": mat("Herb green", (0.42, 0.66, 0.16)),
    "crop_c": mat("Leaf vegetable", (0.12, 0.42, 0.12)),
    "market_red": mat("Market red", (0.84, 0.13, 0.07)),
    "market_yellow": mat("Market yellow", (0.95, 0.68, 0.12)),
    "market_blue": mat("Market blue", (0.25, 0.58, 0.74)),
    "market_green": mat("Market green", (0.33, 0.68, 0.26)),
    "cream": mat("Canvas cream", (0.94, 0.86, 0.62)),
    "shirt": mat("Villager blue", (0.09, 0.34, 0.75)),
}

# Board and quilt-like rice fields around the village.
box("Village Map Base", 0, 0, 360, 230, 2.2, M["ground"], base=-2.0, bevel=3.5)

field_specs = [
    (-148, -92, 54, 32, M["field_a"], -6), (-88, -99, 48, 27, M["field_b"], 4),
    (-26, -102, 58, 23, M["field_c"], -2), (48, -101, 62, 25, M["field_b"], 3),
    (118, -98, 50, 30, M["field_a"], -4), (163, -69, 30, 38, M["field_c"], 2),
    (-166, -43, 28, 47, M["field_c"], 3), (-166, 19, 28, 53, M["field_a"], -2),
    (-165, 79, 31, 42, M["field_b"], 4), (-124, 102, 45, 20, M["field_c"], -2),
    (-71, 104, 48, 20, M["field_a"], 3), (-15, 105, 49, 20, M["field_b"], -3),
    (45, 105, 50, 20, M["field_c"], 2), (105, 103, 54, 23, M["field_a"], -4),
    (158, 86, 34, 34, M["field_b"], 3), (168, 35, 25, 42, M["field_c"], -3),
]
for index, spec in enumerate(field_specs):
    rice_field(f"Outer Rice Field {index}", *spec)

# Broad branching paths arranged around the central tree.
roads = [
    [(0, 0), (-72, 4), (-130, 28), (-175, 50)],
    [(0, 0), (58, -6), (118, -28), (176, -45)],
    [(0, 0), (50, 40), (104, 76), (150, 110)],
    [(0, 0), (-35, 50), (-75, 82), (-108, 112)],
    [(-105, -58), (-54, -34), (0, 0), (70, 11), (122, 34)],
]
for index, points in enumerate(roads):
    ribbon(f"Road Edge {index}", points, 12.5, M["road_edge"], height=0.48)
    ribbon(f"Village Road {index}", points, 9.0, M["road"], height=0.72)

# Central sacred banyan and stone enclosure.
box("Banyan Courtyard", 0, 0, 60, 46, 0.45, M["courtyard"], base=0.68, bevel=3.0)
for x, z, w, d in [(0, -23, 62, 3), (0, 23, 62, 3), (-30, 0, 3, 47), (30, 0, 3, 47)]:
    box("Banyan Stone Wall", x, z, w, d, 4.2, M["stone"], base=0.78, bevel=0.65)
cylinder("Ancient Banyan Trunk", 0, 0, 5.0, 17, M["trunk"], base=0.7, vertices=20)
for index, (dx, dz, radius, h) in enumerate([
    (-11, -3, 11, 20), (0, -7, 12, 22), (11, -3, 10, 20),
    (-14, 7, 9, 19), (-4, 8, 12, 23), (9, 9, 11, 21),
    (-6, -15, 8, 20), (7, -15, 8, 19), (16, 5, 7, 18),
]):
    sphere(f"Ancient Banyan Crown {index}", dx, dz, radius, [M["leaf_mid"], M["leaf_light"], M["leaf_dark"]][index % 3], h, scale=(1.0, 0.9, 0.62))

# Temple compound west, market and village well east.
temple("Village Temple", -102, 8)
stone_well("Market Well", 82, 8)
stall_colors = [M["market_red"], M["market_yellow"], M["market_blue"], M["market_green"], M["cream"]]
for index, (sx, sz) in enumerate([(60, -14), (78, -20), (98, -12), (112, 5), (102, 24), (80, 29), (60, 22)]):
    market_stall(f"Market Stall {index}", sx, sz, stall_colors[index % len(stall_colors)])

# Lotus ponds mirror the reference composition.
pond("Southwest Lotus Pond", -118, 64, 43, 27)
pond("Northwest Lotus Pond", -126, -69, 33, 21)

# Houses form a compact ring around the square.
house_specs = [
    (-78, -61, 25, 14, 3), (-38, -74, 23, 13, -2), (12, -78, 24, 14, 2),
    (61, -67, 25, 14, -2), (108, -57, 26, 15, 2), (136, -16, 24, 14, -4),
    (137, 38, 25, 15, 3), (108, 70, 24, 14, -2), (60, 77, 25, 15, 3),
    (8, 79, 23, 14, -2), (-44, 77, 25, 14, 3), (-82, 72, 22, 13, -3),
    (-138, 30, 24, 14, 3), (-139, -24, 23, 13, -3),
]
for index, (hx, hz, width, depth, angle) in enumerate(house_specs):
    tiled_house(
        f"Village House {index}", hx, hz, width, depth, angle,
        wall=M["plaster_light"] if index % 4 == 0 else M["plaster"],
        roof=M["roof_dark"] if index % 5 == 0 else M["roof"],
        veranda=index % 3 != 1,
    )

# Productive gardens between homes.
gardens = [
    (-55, -48, 30, 16, 5, 1), (-9, -57, 28, 16, 5, -2), (38, -55, 27, 15, 5, 2),
    (119, 13, 24, 16, 5, -3), (87, 55, 31, 17, 6, 2), (31, 57, 30, 17, 6, -1),
    (-25, 57, 28, 16, 5, 2), (-72, 52, 27, 16, 5, -2),
]
for index, spec in enumerate(gardens):
    garden(f"Village Garden {index}", *spec)

# Bamboo/wood fences as light visual dividers.
fences = [
    [(-94, -47), (-63, -41)], [(-21, -88), (22, -88)], [(74, -81), (117, -72)],
    [(145, 5), (151, 41)], [(91, 89), (49, 91)], [(-12, 93), (-53, 90)],
    [(-105, 82), (-138, 68)], [(-151, 11), (-151, -24)],
]
for index, points in enumerate(fences):
    ribbon(f"Village Fence {index}", points, 0.85, M["wood_dark"], height=1.4)

# Dense green frame around buildings, with palms near ponds and houses.
tree_positions = [
    (-153, -89), (-113, -94), (-74, -96), (-45, -101), (3, -101), (45, -96), (83, -91),
    (126, -84), (157, -52), (158, -18), (158, 18), (157, 55), (145, 83), (119, 96),
    (77, 95), (36, 94), (-10, 96), (-54, 96), (-93, 95), (-139, 87), (-153, 53),
    (-154, 10), (-153, -32), (-144, -61), (-86, -41), (-54, -23), (49, -34),
    (121, -37), (120, 50), (53, 43), (-52, 36), (-96, 45),
]
for index, (tx, tz) in enumerate(tree_positions):
    tree(f"Village Shade Tree {index}", tx, tz, radius=4.2 + (index % 4) * 0.75, trunk=5.5 + (index % 3), palette=index)

for index, (px, pz, ph) in enumerate([
    (-149, 62, 11), (-98, 82, 12), (-87, -82, 11), (-19, -91, 12),
    (89, -78, 12), (145, -31, 11), (146, 61, 12), (74, 88, 11),
]):
    palm(f"Village Palm {index}", px, pz, ph)

# One tiny villager for scale.
cylinder("Villager Body", -12, 22, 0.75, 3.0, M["shirt"], base=0.75, vertices=12)
sphere("Villager Head", -12, 22, 0.72, M["plaster_light"], 4.15, subdivisions=2)

# Warm illustrated lighting and isometric camera.
bpy.ops.object.light_add(type="SUN", location=(0, 0, 320))
sun = bpy.context.object
sun.name = "Warm Storybook Sun"
sun.data.energy = 2.6
sun.data.angle = math.radians(22)
sun.rotation_euler = (math.radians(30), math.radians(-28), math.radians(-35))

bpy.ops.object.light_add(type="AREA", location=(-40, -30, 260))
fill = bpy.context.object
fill.name = "Soft Golden Fill"
fill.data.energy = 1450
fill.data.shape = "DISK"
fill.data.size = 240

bpy.ops.object.camera_add(location=(245, -285, 330))
camera = bpy.context.object
camera.name = "Reference Style Isometric Camera"
camera.rotation_euler = (Vector((0, 0, 0)) - camera.location).to_track_quat("-Z", "Y").to_euler()
camera.data.type = "ORTHO"
camera.data.ortho_scale = 285
bpy.context.scene.camera = camera

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 2048
scene.render.resolution_y = 1152
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.filepath = str(RENDER_PATH)
scene.render.film_transparent = False
scene.render.use_freestyle = True
scene.render.line_thickness = 0.75
scene.world.use_nodes = True
background = scene.world.node_tree.nodes.get("Background")
background.inputs["Color"].default_value = (0.055, 0.075, 0.038, 1.0)
background.inputs["Strength"].default_value = 0.32
scene.view_settings.look = "AgX - Medium High Contrast"
scene.view_settings.exposure = 0.35

bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
bpy.ops.render.render(write_still=True)

result = {
    "status": "ok",
    "blend_path": str(BLEND_PATH),
    "render_path": str(RENDER_PATH),
    "objects": len(bpy.data.objects),
    "resolution": [scene.render.resolution_x, scene.render.resolution_y],
}
