import bpy
import math
import random
from pathlib import Path
from mathutils import Vector


OUTPUT_DIR = Path(r"C:\Users\Admin\.gemini\antigravity\scratch\NumerologyWebApp\mobile_app\artifacts")
BLEND_PATH = OUTPUT_DIR / "hanh_trinh_dom_dom.blend"
RENDER_PATH = OUTPUT_DIR / "hanh_trinh_dom_dom_preview.png"

random.seed(2407)


def world(x, z, height=0.0):
    """Convert the supplied map coordinates to Blender XYZ.

    Map north is Z < 0. Blender world +Y is rendered toward the top of the map,
    so map Z is inverted into Blender Y.
    """
    return (float(x), float(-z), float(height))


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def make_material(name, color, roughness=0.65, metallic=0.0, emission=None, emission_strength=0.0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.diffuse_color = (*color[:3], color[3] if len(color) > 3 else 1.0)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = mat.diffuse_color
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if emission is not None:
        emission_socket = bsdf.inputs.get("Emission Color") or bsdf.inputs.get("Emission")
        if emission_socket:
            emission_socket.default_value = (*emission[:3], 1.0)
        strength_socket = bsdf.inputs.get("Emission Strength")
        if strength_socket:
            strength_socket.default_value = emission_strength
    return mat


def assign_material(obj, material):
    if obj.data and hasattr(obj.data, "materials"):
        obj.data.materials.append(material)
    return obj


def add_box(name, x, z, sx, sy, height, material, base=0.0, rotation=0.0, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(
        location=world(x, z, base + height / 2),
        rotation=(0.0, 0.0, math.radians(rotation)),
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = (sx / 2, sy / 2, height / 2)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign_material(obj, material)
    if bevel:
        modifier = obj.modifiers.new("Soft map edges", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
    return obj


def add_cylinder(name, x, z, radius, depth, material, base=0.0, vertices=16):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=world(x, z, base + depth / 2),
    )
    obj = bpy.context.object
    obj.name = name
    assign_material(obj, material)
    return obj


def add_sphere(name, x, z, radius, material, height=0.0, scale=(1.0, 1.0, 1.0), subdivisions=2):
    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=subdivisions,
        radius=radius,
        location=world(x, z, height),
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign_material(obj, material)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def add_ribbon(name, points, width, material, height=0.5, closed=False):
    converted = [Vector(world(x, z, height)) for x, z in points]
    left = []
    right = []
    for index, point in enumerate(converted):
        prev_point = converted[index - 1] if index else converted[index]
        next_point = converted[(index + 1) % len(converted)] if index < len(converted) - 1 else converted[index]
        direction = Vector((next_point.x - prev_point.x, next_point.y - prev_point.y, 0.0))
        if direction.length == 0:
            direction = Vector((1.0, 0.0, 0.0))
        direction.normalize()
        normal = Vector((-direction.y, direction.x, 0.0)) * (width / 2)
        left.append(point + normal)
        right.append(point - normal)
    vertices = []
    for l_point, r_point in zip(left, right):
        vertices.extend((tuple(l_point), tuple(r_point)))
    faces = []
    span = len(converted) if closed else len(converted) - 1
    for index in range(span):
        nxt = (index + 1) % len(converted)
        faces.append((index * 2, nxt * 2, nxt * 2 + 1, index * 2 + 1))
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    assign_material(obj, material)
    bevel = obj.modifiers.new("Rounded ribbon", "BEVEL")
    bevel.width = 0.55
    bevel.segments = 2
    return obj


def add_gable_roof(name, x, z, width, depth, base_height, roof_height, material):
    half_w = width / 2
    half_d = depth / 2
    verts = [
        (-half_w, -half_d, 0),
        (half_w, -half_d, 0),
        (0, -half_d, roof_height),
        (-half_w, half_d, 0),
        (half_w, half_d, 0),
        (0, half_d, roof_height),
    ]
    faces = [
        (0, 1, 4, 3),
        (0, 2, 5, 3),
        (2, 1, 4, 5),
        (0, 1, 2),
        (3, 5, 4),
    ]
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = world(x, z, base_height)
    bpy.context.collection.objects.link(obj)
    assign_material(obj, material)
    bevel = obj.modifiers.new("Roof edge", "BEVEL")
    bevel.width = 0.8
    bevel.segments = 2
    return obj


def add_house(name, x, z, width=18, depth=12, height=8, wall=None, roof=None, courtyard=False):
    if courtyard:
        add_box(name + " Courtyard", x, z + depth * 0.85, width * 1.45, depth * 0.9, 0.55, MATS["brick"], base=0.45, bevel=0.35)
    add_box(name + " Body", x, z, width, depth, height, wall or MATS["plaster"], base=0.7, bevel=0.6)
    add_gable_roof(name + " Roof", x, z, width + 3.2, depth + 3.0, height + 0.7, 5.0, roof or MATS["terracotta"])
    add_box(name + " Door", x, z - depth / 2 - 0.05, 3.1, 0.35, 4.7, MATS["wood"], base=0.72)
    return name


def add_tree(name, x, z, radius=5.5, trunk_height=7.0, leaf=None):
    add_cylinder(name + " Trunk", x, z, max(0.7, radius * 0.19), trunk_height, MATS["trunk"], base=0.7, vertices=12)
    add_sphere(name + " Canopy A", x, z, radius, leaf or MATS["leaf"], height=trunk_height + 2.8, scale=(1.0, 0.9, 0.7))
    add_sphere(name + " Canopy B", x - radius * 0.55, z + radius * 0.1, radius * 0.66, leaf or MATS["leaf_light"], height=trunk_height + 3.0, scale=(1.0, 0.9, 0.75))
    add_sphere(name + " Canopy C", x + radius * 0.55, z - radius * 0.15, radius * 0.7, leaf or MATS["leaf_dark"], height=trunk_height + 2.6, scale=(1.0, 0.95, 0.72))


def add_rock(name, x, z, radius=2.0, material=None):
    rock = add_sphere(
        name,
        x,
        z,
        radius,
        material or MATS["rock"],
        height=0.8 + radius * 0.45,
        scale=(1.0 + random.random() * 0.55, 0.72 + random.random() * 0.38, 0.52 + random.random() * 0.35),
        subdivisions=1,
    )
    rock.rotation_euler.z = random.random() * math.tau
    return rock


def add_shrub(name, x, z, radius=1.8):
    return add_sphere(
        name,
        x,
        z,
        radius,
        MATS["shrub"],
        height=1.0 + radius * 0.55,
        scale=(1.1, 0.9, 0.65),
        subdivisions=1,
    )


def add_bamboo_cluster(name, x, z, count=8):
    for index in range(count):
        angle = (index / count) * math.tau
        distance = 2.0 + (index % 3) * 0.7
        px = x + math.cos(angle) * distance
        pz = z + math.sin(angle) * distance
        height = 10 + (index % 4) * 1.2
        add_cylinder(f"{name} Stem {index}", px, pz, 0.34, height, MATS["bamboo"], base=0.7, vertices=8)
        add_sphere(f"{name} Leaf {index}", px, pz, 1.25, MATS["leaf_light"], height=height + 0.8, scale=(0.65, 1.5, 0.45), subdivisions=1)


def add_label(text, x, z, size=5.2, height=11.0, color=None, extrude=0.08):
    curve = bpy.data.curves.new(text + " Text", "FONT")
    curve.body = text
    curve.align_x = "CENTER"
    curve.align_y = "CENTER"
    curve.size = size
    curve.extrude = extrude
    curve.bevel_depth = 0.025
    curve.materials.append(color or MATS["ink"])
    if FONT:
        curve.font = FONT
    obj = bpy.data.objects.new(text, curve)
    obj.location = world(x, z, height)
    bpy.context.collection.objects.link(obj)
    return obj


def add_rice_field(name, x, z, width, depth, angle=0):
    add_box(name, x, z, width, depth, 0.35, MATS["rice"], base=0.45, rotation=angle, bevel=0.8)
    step = 5.5
    rows = int(depth / step)
    for row in range(-rows // 2, rows // 2 + 1):
        offset = row * step
        add_box(f"{name} Furrow {row}", x, z + offset, width * 0.9, 0.7, 0.18, MATS["rice_dark"], base=0.88, rotation=angle)


def add_market_stall(name, x, z, canopy):
    add_box(name + " Table", x, z, 7.0, 4.8, 1.8, MATS["wood"], base=0.7, bevel=0.25)
    for dx in (-2.8, 2.8):
        for dz in (-1.7, 1.7):
            add_cylinder(name + " Pole", x + dx, z + dz, 0.18, 5.2, MATS["wood_dark"], base=0.7, vertices=8)
    add_box(name + " Awning", x, z, 8.0, 5.7, 0.35, canopy, base=5.8, bevel=0.25)


def add_sampan(name, x, z, angle=0):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=8, location=world(x, z, 1.6))
    boat = bpy.context.object
    boat.name = name
    boat.scale = (4.5, 1.25, 0.55)
    boat.rotation_euler.z = math.radians(angle)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign_material(boat, MATS["wood"])
    add_cylinder(name + " Mast", x, z, 0.16, 4.0, MATS["wood_dark"], base=1.4, vertices=8)


def add_arch_gate(name, x, z):
    add_box(name + " Left", x - 7.5, z, 5.5, 5.0, 13.0, MATS["brick"], base=0.7, bevel=0.7)
    add_box(name + " Right", x + 7.5, z, 5.5, 5.0, 13.0, MATS["brick"], base=0.7, bevel=0.7)
    add_box(name + " Beam", x, z, 21.0, 5.2, 4.5, MATS["brick"], base=10.1, bevel=1.0)
    add_gable_roof(name + " Roof", x, z, 25.0, 8.0, 14.6, 4.5, MATS["terracotta_dark"])
    add_label("CỔNG LÀNG", x, z - 0.2, size=2.6, height=11.7, color=MATS["cream"], extrude=0.03)


def add_well(name, x, z):
    add_cylinder(name + " Stone ring", x, z, 5.0, 2.3, MATS["stone"], base=0.7, vertices=24)
    add_cylinder(name + " Water", x, z, 3.6, 0.25, MATS["water"], base=3.0, vertices=24)
    add_cylinder(name + " Post L", x - 4.3, z, 0.32, 7.0, MATS["wood"], base=0.7, vertices=8)
    add_cylinder(name + " Post R", x + 4.3, z, 0.32, 7.0, MATS["wood"], base=0.7, vertices=8)
    add_box(name + " Crossbar", x, z, 10.0, 0.7, 0.7, MATS["wood_dark"], base=7.1)


clear_scene()
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Palette inspired by hand-painted rural Vietnamese animation backgrounds.
MATS = {
    "ground": make_material("Warm parchment grass", (0.54, 0.66, 0.31, 1), 0.95),
    "ground_light": make_material("Meadow light", (0.66, 0.75, 0.38, 1), 0.95),
    "ground_dark": make_material("Field border", (0.30, 0.45, 0.20, 1), 0.95),
    "rice": make_material("Golden rice", (0.91, 0.72, 0.20, 1), 0.9),
    "rice_dark": make_material("Rice furrow", (0.58, 0.49, 0.16, 1), 0.95),
    "earth": make_material("Dirt road", (0.58, 0.38, 0.20, 1), 0.98),
    "earth_edge": make_material("Road edge", (0.35, 0.27, 0.16, 1), 0.98),
    "brick": make_material("Old red brick", (0.58, 0.18, 0.10, 1), 0.88),
    "brick_light": make_material("Sunlit brick", (0.78, 0.33, 0.18, 1), 0.85),
    "terracotta": make_material("Terracotta roof", (0.55, 0.12, 0.06, 1), 0.8),
    "terracotta_dark": make_material("Dark terracotta", (0.32, 0.055, 0.035, 1), 0.84),
    "plaster": make_material("Warm plaster", (0.84, 0.72, 0.49, 1), 0.92),
    "yellow": make_material("School yellow", (0.91, 0.63, 0.18, 1), 0.86),
    "clinic": make_material("Clinic mint", (0.62, 0.84, 0.70, 1), 0.84),
    "post": make_material("Post office cream", (0.92, 0.82, 0.58, 1), 0.88),
    "shop": make_material("Shop blue", (0.32, 0.62, 0.69, 1), 0.84),
    "wood": make_material("Aged wood", (0.37, 0.20, 0.09, 1), 0.9),
    "wood_dark": make_material("Dark wood", (0.18, 0.075, 0.035, 1), 0.9),
    "stone": make_material("Village stone", (0.45, 0.47, 0.42, 1), 0.95),
    "water": make_material("River blue", (0.08, 0.46, 0.68, 1), 0.35, metallic=0.08),
    "water_light": make_material("Water highlight", (0.25, 0.75, 0.86, 1), 0.3),
    "trunk": make_material("Tree trunk", (0.24, 0.12, 0.045, 1), 0.95),
    "leaf": make_material("Leaf green", (0.15, 0.43, 0.16, 1), 0.92),
    "leaf_light": make_material("Leaf sunlit", (0.35, 0.67, 0.22, 1), 0.92),
    "leaf_dark": make_material("Leaf shade", (0.075, 0.25, 0.10, 1), 0.94),
    "forest_leaf": make_material("Deep forest green", (0.08, 0.31, 0.13, 1), 0.95),
    "shrub": make_material("Forest undergrowth", (0.19, 0.46, 0.16, 1), 0.96),
    "rock": make_material("Mossy rock", (0.31, 0.35, 0.28, 1), 0.97),
    "rock_light": make_material("Sunlit rock", (0.49, 0.49, 0.40, 1), 0.96),
    "bamboo": make_material("Bamboo", (0.42, 0.64, 0.16, 1), 0.82),
    "ink": make_material("Map ink", (0.12, 0.075, 0.035, 1), 0.96),
    "cream": make_material("Warm cream", (0.98, 0.91, 0.68, 1), 0.88),
    "red": make_material("Festival red", (0.78, 0.08, 0.045, 1), 0.75),
    "firefly": make_material("Firefly glow", (0.88, 1.0, 0.25, 1), 0.3, emission=(0.6, 1.0, 0.12), emission_strength=12.0),
}

try:
    FONT = bpy.data.fonts.load(r"C:\Windows\Fonts\arial.ttf")
except Exception:
    FONT = None

# Base board and border.
add_box("Map Base", 0, 0, 440, 440, 2.0, MATS["ground"], base=-1.8, bevel=4.0)
add_box("North border", 0, -218, 436, 4, 1.2, MATS["ink"], base=0.1)
add_box("South border", 0, 218, 436, 4, 1.2, MATS["ink"], base=0.1)
add_box("West border", -218, 0, 4, 436, 1.2, MATS["ink"], base=0.1)
add_box("East border", 218, 0, 4, 436, 1.2, MATS["ink"], base=0.1)

# River banks and water.
river_points = [(102, -218), (109, -175), (101, -125), (91, -70), (88, -20), (94, 30), (105, 82), (122, 135), (140, 185), (149, 218)]
add_ribbon("River bank", river_points, 25.0, MATS["earth_edge"], height=0.35)
add_ribbon("Winding East River", river_points, 19.0, MATS["water"], height=0.8)
add_ribbon("River sparkle", [(x - 2, z) for x, z in river_points], 1.4, MATS["water_light"], height=1.05)

# Main road hierarchy.
roads = [
    ("North South Road", [(0, 112), (-4, 62), (0, 10), (2, -55), (-6, -125), (-10, -200)], 10),
    ("West East Road", [(-204, 12), (-155, 15), (-90, 18), (-20, 10), (36, 18), (74, 30), (112, 30), (153, 20)], 9),
    ("South Road", [(0, 82), (-5, 135), (-10, 170), (40, 170), (125, 172)], 8),
    ("Market Lane", [(-55, 18), (-35, 34), (-10, 50), (35, 55), (75, 32)], 6),
    ("Orchard Lane", [(-60, 15), (-55, -25), (-22, -52), (2, -75)], 5),
]
for road_name, road_points, road_width in roads:
    add_ribbon(road_name + " Edge", road_points, road_width + 3, MATS["earth_edge"], height=0.47)
    add_ribbon(road_name, road_points, road_width, MATS["earth"], height=0.7)

# Central red brick square.
add_box("Village Crossroad Square", 0, 10, 58, 48, 0.55, MATS["brick_light"], base=0.65, bevel=3.5)
for offset in range(-22, 23, 8):
    add_box(f"Square brick line {offset}", offset, 10, 0.6, 43, 0.12, MATS["brick"], base=1.23)

# Communal house and courtyard at (+15,+10).
add_box("Dinh Lang Courtyard", 15, 24, 50, 28, 0.65, MATS["brick"], base=0.72, bevel=1.2)
add_house("Dinh Lang", 15, 7, width=34, depth=19, height=11, wall=MATS["wood"], roof=MATS["terracotta_dark"])
for pillar_x in (-12, -6, 0, 6, 12):
    add_cylinder("Dinh pillar", 15 + pillar_x, 17, 0.55, 8.5, MATS["wood_dark"], base=1.0, vertices=12)
add_label("ĐÌNH LÀNG", 15, -6, size=5.3, height=13.5, color=MATS["cream"])

# Market at (-10,+50).
for idx, (dx, dz, color) in enumerate([
    (-12, -3, MATS["red"]), (0, -3, MATS["cream"]), (12, -3, MATS["shop"]),
    (-6, 7, MATS["yellow"]), (7, 7, MATS["red"]),
]):
    add_market_stall(f"Market Stall {idx}", -10 + dx, 50 + dz, color)
add_label("CHỢ QUÊ", -10, 67, size=4.8, height=8.2)

# Village gate and bamboo at (0,+105).
add_arch_gate("Cong Lang", 0, 105)
for dx, dz in [(-15, -2), (16, 2), (-22, 7), (23, -6)]:
    add_bamboo_cluster("Gate Bamboo", dx, 105 + dz, count=6)

# Tea stall and carpentry workshop.
add_market_stall("Tea Stall", 31, 53, MATS["cream"])
add_house("Carpentry Workshop", 44, 58, width=15, depth=11, height=7, wall=MATS["wood"], roof=MATS["terracotta"])
add_box("Timber Stack", 51, 49, 11, 4, 2.4, MATS["wood"], base=0.7, bevel=0.35)
add_label("TRÀ & MỘC", 38, 69, size=3.2, height=7.5)

# Ancestral home and lotus pond.
add_house("Ancestral Home", -65, 20, width=24, depth=15, height=8.5, wall=MATS["plaster"], roof=MATS["terracotta_dark"], courtyard=True)
add_sphere("Lotus Pond", -88, 28, 10.5, MATS["water"], height=0.75, scale=(1.25, 0.75, 0.08), subdivisions=3)
for idx in range(10):
    angle = idx * 2.4
    radius = 2 + (idx % 4) * 1.4
    px = -88 + math.cos(angle) * radius
    pz = 28 + math.sin(angle) * radius * 0.65
    add_cylinder(f"Lotus pad {idx}", px, pz, 0.9, 0.12, MATS["leaf_light"], base=1.55, vertices=16)

# Orchard.
for idx, (ox, oz) in enumerate([(-70, -37), (-56, -39), (-43, -34), (-68, -22), (-54, -22), (-40, -19), (-62, -7), (-46, -5)]):
    add_tree(f"Pomelo Longan {idx}", ox, oz, radius=4.7 + (idx % 2), trunk_height=5.5)
add_label("VƯỜN BƯỞI • NHÃN", -55, -48, size=3.5, height=7.8)

# North paddies and kite meadow.
for idx, args in enumerate([
    (-18, -86, 42, 27, -4), (30, -88, 38, 25, 4), (-16, -122, 46, 24, 2), (34, -125, 42, 25, -3),
    (25, -155, 36, 22, 2), (66, -160, 31, 23, -3), (27, -184, 32, 18, 0), (67, -192, 30, 18, 4),
]):
    add_rice_field(f"North Rice Field {idx}", *args)
add_box("Kite Meadow", 10, -66, 64, 34, 0.25, MATS["ground_light"], base=0.42, bevel=4.0)
for idx, (kx, kz, color) in enumerate([(-4, -69, MATS["red"]), (15, -75, MATS["yellow"]), (28, -63, MATS["shop"])]):
    add_box(f"Kite {idx}", kx, kz, 3.2, 3.2, 0.2, color, base=12 + idx * 3, rotation=45)
    add_ribbon(f"Kite String {idx}", [(kx, kz), (kx - 4, kz + 7), (kx - 7, kz + 12)], 0.25, MATS["ink"], height=2.5 + idx)
add_label("CÁNH ĐỒNG THẢ DIỀU", 8, -104, size=3.6, height=8.0)

# Sacred banyan at (+65,-95) with fireflies.
add_cylinder("Sacred Banyan Trunk", 65, -95, 4.8, 15, MATS["trunk"], base=0.7, vertices=18)
for idx, (dx, dz, scale) in enumerate([(-8, -2, 1.0), (0, 0, 1.2), (9, -1, 1.0), (-3, 7, 0.9), (5, 8, 0.85)]):
    add_sphere(f"Banyan Canopy {idx}", 65 + dx, -95 + dz, 10.5, MATS["leaf_dark" if idx % 2 else "leaf"], height=17 + idx % 3, scale=(scale, scale * 0.9, 0.65))
for idx in range(90):
    angle = random.random() * math.tau
    radius = 5 + random.random() * 22
    px = 65 + math.cos(angle) * radius
    pz = -95 + math.sin(angle) * radius
    py = 7 + random.random() * 20
    add_sphere(f"Firefly {idx:03d}", px, pz, 0.22 + random.random() * 0.18, MATS["firefly"], height=py, subdivisions=1)
add_label("GỐC ĐA BÍ ẨN", 65, -122, size=4.5, height=12.0, color=MATS["cream"])

# North hamlet and shrine.
for idx, (hx, hz) in enumerate([(-76, -164), (-51, -170), (-27, -163), (-68, -190), (-40, -192)]):
    add_house(f"Xom Bac House {idx}", hx, hz, width=18, depth=12, height=7.5, wall=MATS["plaster"], roof=MATS["terracotta"])
    add_box(f"Threshing Floor {idx}", hx, hz + 11, 16, 8, 0.35, MATS["earth"], base=0.62, bevel=1.5)
add_house("Ancient North Shrine", -10, -195, width=16, depth=10, height=8, wall=MATS["brick"], roof=MATS["terracotta_dark"])
for idx, (hx, hz) in enumerate([(-101, -143), (-102, -171), (-98, -202), (-74, -138), (-25, -137), (-12, -174)]):
    wall = MATS["wood"] if idx % 3 == 0 else MATS["plaster"]
    roof = MATS["terracotta_dark"] if idx % 2 else MATS["terracotta"]
    add_house(f"Xom Bac Dense House {idx}", hx, hz, width=15 + idx % 3, depth=10 + idx % 2, height=6.8 + (idx % 2), wall=wall, roof=roof, courtyard=idx in {1, 4})
add_label("XÓM BẮC", -52, -145, size=5.0, height=10.0)
add_ribbon("North Hamlet Bamboo Fence A", [(-111, -132), (-83, -129), (-62, -134)], 1.0, MATS["bamboo"], height=1.5)
add_ribbon("North Hamlet Bamboo Fence B", [(-112, -214), (-78, -212), (-52, -210)], 1.0, MATS["bamboo"], height=1.5)

# Wooden bridge around X 64-86, Z 30; it reaches over the river bend near X 94.
for idx, bx in enumerate(range(68, 116, 4)):
    add_box(f"Bridge plank {idx}", bx, 30, 3.5, 14.0, 0.8, MATS["wood"], base=2.0, bevel=0.25)
for bz in (24, 36):
    add_ribbon("Bridge rail", [(68, bz), (115, bz)], 0.8, MATS["wood_dark"], height=5.0)
add_label("CẦU GỖ", 89, 17, size=3.4, height=7.0)

# East fishing hamlet.
for idx, (hx, hz) in enumerate([(145, -3), (166, 4), (143, 28), (170, 34), (157, 54)]):
    add_house(f"Xom Dong House {idx}", hx, hz, width=16, depth=11, height=7, wall=MATS["wood"], roof=MATS["terracotta"])
for idx, (hx, hz) in enumerate([(188, -22), (164, -25), (190, 7), (193, 31), (136, 57), (188, 56)]):
    wall = MATS["wood"] if idx % 2 == 0 else MATS["plaster"]
    roof = MATS["terracotta"] if idx % 3 else MATS["terracotta_dark"]
    add_house(f"Xom Dong Dense House {idx}", hx, hz, width=14 + idx % 3, depth=10 + idx % 2, height=6.6 + (idx % 2), wall=wall, roof=roof, courtyard=idx in {2, 5})
for idx, z_pos in enumerate((-6, 15, 42)):
    add_ribbon(f"Dock {idx}", [(112, z_pos), (139, z_pos)], 4.5, MATS["wood"], height=2.0)
add_sampan("Sampan A", 111, 6, angle=80)
add_sampan("Sampan B", 116, 48, angle=98)
for idx, (nx, nz) in enumerate([(179, 2), (184, 23), (181, 46)]):
    add_cylinder(f"Fishing Net Pole {idx}", nx, nz, 0.28, 9, MATS["wood_dark"], base=0.7, vertices=8)
    add_ribbon(f"Fishing Net {idx}", [(nx - 6, nz - 3), (nx, nz), (nx + 6, nz - 3)], 0.35, MATS["cream"], height=5.2)
add_label("XÓM ĐÔNG", 160, 70, size=5.3, height=10.0)
add_ribbon("East Hamlet Fence A", [(132, -34), (164, -38), (199, -34)], 0.9, MATS["wood_dark"], height=1.4)
add_ribbon("East Hamlet Fence B", [(134, 66), (164, 72), (199, 68)], 0.9, MATS["wood_dark"], height=1.4)

# South civic cluster.
add_house("Primary School", -50, 185, width=34, depth=16, height=9, wall=MATS["yellow"], roof=MATS["terracotta"])
add_box("School Yard", -50, 166, 38, 20, 0.4, MATS["earth"], base=0.6, bevel=2.0)
add_label("TRƯỜNG HỌC", -50, 199, size=3.6, height=11.0)
add_house("Health Clinic", -10, 170, width=18, depth=13, height=8, wall=MATS["clinic"], roof=MATS["terracotta"])
add_box("Clinic Cross V", -10, 163.3, 1.3, 0.4, 4.8, MATS["red"], base=5.4)
add_box("Clinic Cross H", -10, 163.3, 4.8, 0.4, 1.3, MATS["red"], base=7.15)
add_house("Post Office", 15, 170, width=18, depth=12, height=8, wall=MATS["post"], roof=MATS["terracotta_dark"])
add_label("BƯU ĐIỆN", 15, 181, size=2.7, height=9.5)
add_house("Village Shop", 40, 165, width=16, depth=11, height=7, wall=MATS["shop"], roof=MATS["terracotta"])
add_label("TẠP HÓA", 40, 175, size=2.5, height=8.6)
add_box("Bus Stop Platform", 125, 172, 31, 8, 0.5, MATS["stone"], base=0.6, bevel=1.2)
add_box("Bus Stop Roof", 125, 172, 24, 7, 0.7, MATS["red"], base=7.3, bevel=0.5)
for px in (116, 134):
    add_cylinder("Bus Stop Post", px, 172, 0.35, 6.2, MATS["wood_dark"], base=0.8, vertices=8)
add_label("BẾN XE", 125, 181, size=3.2, height=9.0)
add_label("XÓM NAM", 4, 207, size=5.2, height=8.5)
for idx, (hx, hz) in enumerate([(-91, 143), (-72, 143), (-92, 176), (-88, 205), (68, 145), (72, 190), (98, 204)]):
    wall = [MATS["plaster"], MATS["wood"], MATS["post"]][idx % 3]
    roof = MATS["terracotta_dark"] if idx % 2 else MATS["terracotta"]
    add_house(f"Xom Nam Dense House {idx}", hx, hz, width=15 + idx % 4, depth=10 + idx % 2, height=6.8 + (idx % 3) * 0.4, wall=wall, roof=roof, courtyard=idx in {0, 3, 6})
add_ribbon("South Hamlet Fence A", [(-105, 129), (-82, 126), (-60, 132)], 0.9, MATS["bamboo"], height=1.4)
add_ribbon("South Hamlet Fence B", [(56, 132), (82, 127), (108, 134)], 0.9, MATS["bamboo"], height=1.4)

# West hamlet and ancient well.
for idx, (hx, hz) in enumerate([(-168, -8), (-143, -11), (-164, 31), (-137, 31), (-188, 43)]):
    add_house(f"Xom Tay House {idx}", hx, hz, width=20, depth=13, height=7.5, wall=MATS["plaster"], roof=MATS["terracotta_dark"], courtyard=idx < 3)
for idx, (hx, hz) in enumerate([(-207, -31), (-181, -34), (-151, -39), (-208, 72), (-184, 77), (-132, 74), (-123, -43)]):
    wall = MATS["wood"] if idx in {1, 4} else MATS["plaster"]
    roof = MATS["terracotta_dark"] if idx % 2 else MATS["terracotta"]
    add_house(f"Xom Tay Dense House {idx}", hx, hz, width=16 + idx % 3, depth=11 + idx % 2, height=7.0, wall=wall, roof=roof, courtyard=idx in {0, 3, 5})
for idx, z_pos in enumerate(range(-25, 57, 10)):
    add_bamboo_cluster(f"West Hedge {idx}", -120, z_pos, count=4)
add_well("Ancient Stone Well", -188, 12)
add_label("GIẾNG ĐÁ CỔ", -188, 27, size=3.0, height=8.0)
add_label("XÓM TÂY", -155, 58, size=5.3, height=10.0)
add_ribbon("West Hamlet Fence A", [(-215, -51), (-180, -55), (-145, -51)], 1.0, MATS["bamboo"], height=1.5)
add_ribbon("West Hamlet Fence B", [(-214, 89), (-177, 94), (-128, 89)], 1.0, MATS["bamboo"], height=1.5)

# Four additional homes around the core village, placed away from roads and landmarks.
for idx, (hx, hz) in enumerate([(-101, 73), (-79, 85), (63, 82), (72, -43)]):
    wall = MATS["plaster"] if idx != 3 else MATS["wood"]
    roof = MATS["terracotta"] if idx % 2 == 0 else MATS["terracotta_dark"]
    add_house(f"Core Village Dense House {idx}", hx, hz, width=16 + idx, depth=11, height=7.2, wall=wall, roof=roof, courtyard=idx in {0, 2})
add_ribbon("Core Village Fence A", [(-111, 94), (-89, 100), (-66, 96)], 0.8, MATS["bamboo"], height=1.4)
add_ribbon("Core Village Fence B", [(52, 96), (72, 101), (89, 93)], 0.8, MATS["bamboo"], height=1.4)

# Small ambient trees around the map edge.
edge_trees = [
    (-205, -150), (-190, -120), (-205, -70), (-200, 95), (-185, 125), (-155, 140),
    (198, -165), (181, -130), (198, -82), (203, 92), (188, 126), (176, 148),
]
for idx, (tx, tz) in enumerate(edge_trees):
    add_tree(f"Border Tree {idx}", tx, tz, radius=5.5 + idx % 3, trunk_height=6.0 + idx % 2)

# Dense north-west forest occupying roughly one quarter of the map corner.
forest_positions = []
for index in range(55):
    fx = random.uniform(-210, -112)
    fz = random.uniform(-207, -78)
    forest_positions.append((fx, fz))
for idx, (fx, fz) in enumerate(forest_positions):
    leaf_material = [MATS["forest_leaf"], MATS["leaf_dark"], MATS["leaf"]][idx % 3]
    add_tree(
        f"Northwest Forest Tree {idx}",
        fx,
        fz,
        radius=3.8 + random.random() * 2.8,
        trunk_height=5.2 + random.random() * 4.5,
        leaf=leaf_material,
    )
for idx in range(28):
    add_shrub(
        f"Northwest Forest Shrub {idx}",
        random.uniform(-208, -114),
        random.uniform(-204, -80),
        radius=1.3 + random.random() * 1.2,
    )
for idx in range(18):
    add_rock(
        f"Northwest Forest Rock {idx}",
        random.uniform(-206, -116),
        random.uniform(-201, -82),
        radius=1.3 + random.random() * 1.8,
        material=MATS["rock"] if idx % 3 else MATS["rock_light"],
    )
add_label("RỪNG TÂY BẮC", -162, -104, size=4.6, height=17.0, color=MATS["cream"])

# Additional vegetation fills the remaining large empty spaces without blocking routes.
ambient_tree_positions = [
    (-107, -62), (-86, -98), (-94, -118), (-113, -19), (-104, 15), (-104, 110),
    (-82, 121), (-115, 154), (-104, 194), (-72, 114), (-30, 120), (22, 126),
    (57, 112), (88, 92), (126, 94), (153, 92), (187, 78), (204, 55),
    (202, -48), (190, -75), (178, -104), (170, -150), (151, -184), (128, -202),
    (93, -210), (82, -176), (99, -142), (112, -105), (128, -70), (149, -48),
    (-210, 120), (-202, 153), (-183, 179), (-145, 190), (112, 213), (164, 201),
]
for idx, (tx, tz) in enumerate(ambient_tree_positions):
    add_tree(
        f"Village Ambient Tree {idx}",
        tx,
        tz,
        radius=3.8 + (idx % 4) * 0.65,
        trunk_height=5.0 + (idx % 3),
        leaf=MATS["leaf"] if idx % 3 else MATS["leaf_light"],
    )

# Rock clusters around field edges, river approaches and settlement outskirts.
rock_zones = [
    (-210, -120, 100, 205),
    (170, 208, -190, -70),
    (155, 208, 80, 205),
    (-110, 108, 115, 214),
]
rock_index = 0
for min_x, max_x, min_z, max_z in rock_zones:
    for _ in range(8):
        add_rock(
            f"Village Rock {rock_index}",
            random.uniform(min_x, max_x),
            random.uniform(min_z, max_z),
            radius=1.0 + random.random() * 1.7,
            material=MATS["rock_light"] if rock_index % 4 == 0 else MATS["rock"],
        )
        rock_index += 1

# Map title plaque and compass rose.
add_box("Title Plaque", 0, -210, 124, 18, 0.55, MATS["cream"], base=1.0, bevel=4.0)
add_label("HÀNH TRÌNH ĐOM ĐÓM", 0, -210, size=7.3, height=2.0, color=MATS["ink"], extrude=0.05)
add_cylinder("Compass Ring", 194, -190, 13.0, 0.4, MATS["cream"], base=1.0, vertices=32)
add_label("BẮC", 194, -204, size=3.0, height=2.0)
add_ribbon("Compass North", [(194, -192), (194, -204)], 2.0, MATS["red"], height=2.2)
add_ribbon("Compass East West", [(184, -190), (204, -190)], 1.1, MATS["ink"], height=2.15)

# Lighting.
bpy.ops.object.light_add(type="SUN", location=(0, 0, 420))
sun = bpy.context.object
sun.name = "Warm Afternoon Sun"
sun.data.energy = 2.2
sun.data.angle = math.radians(18)
sun.rotation_euler = (math.radians(28), math.radians(-24), math.radians(-32))

bpy.ops.object.light_add(type="AREA", location=(0, -80, 420))
fill = bpy.context.object
fill.name = "Soft Sky Fill"
fill.data.energy = 1900
fill.data.shape = "DISK"
fill.data.size = 320

# Camera: mostly top-down with a gentle isometric tilt while preserving north at the top.
bpy.ops.object.camera_add(location=(285, -355, 505))
camera = bpy.context.object
camera.name = "Hanh Trinh Map Camera"
direction = Vector((0, 0, 0)) - camera.location
camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
camera.data.type = "ORTHO"
camera.data.ortho_scale = 585
camera.data.lens = 58
bpy.context.scene.camera = camera

# Render settings.
scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 2048
scene.render.resolution_y = 2048
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.film_transparent = False
scene.render.filepath = str(RENDER_PATH)
scene.render.use_file_extension = True
scene.render.image_settings.color_depth = "8"

scene.world.color = (0.055, 0.075, 0.045)
scene.world.use_nodes = True
world_bg = scene.world.node_tree.nodes.get("Background")
world_bg.inputs["Color"].default_value = (0.045, 0.065, 0.045, 1.0)
world_bg.inputs["Strength"].default_value = 0.28

# Color management for a warm illustrated look.
scene.view_settings.look = "AgX - Medium High Contrast"
scene.view_settings.exposure = 0.25

# Save and render.
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
bpy.ops.render.render(write_still=True)

result = {
    "status": "ok",
    "blend_path": str(BLEND_PATH),
    "render_path": str(RENDER_PATH),
    "objects": len(bpy.data.objects),
    "resolution": [scene.render.resolution_x, scene.render.resolution_y],
}
