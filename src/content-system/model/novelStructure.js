export const defaultChapterStructure = {
  enableVolumes: false,
  enableSections: false,
  volumeLabel: "卷",
  chapterLabel: "章",
  sectionLabel: "小节",
};

export const unassignedVolumeId = "__unassigned__";

export function normalizeChapterStructureConfig(value = {}) {
  return {
    ...defaultChapterStructure,
    ...(value && typeof value === "object" && !Array.isArray(value) ? value : {}),
    enableVolumes: Boolean(value?.enableVolumes),
    enableSections: Boolean(value?.enableSections),
    volumeLabel: String(value?.volumeLabel || defaultChapterStructure.volumeLabel),
    chapterLabel: String(value?.chapterLabel || defaultChapterStructure.chapterLabel),
    sectionLabel: String(value?.sectionLabel || defaultChapterStructure.sectionLabel),
  };
}

export function makeSlugFragment(value, fallback = "section") {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

export function sectionAnchor(section, index = 0) {
  return section?.anchor || `section-${index + 1}`;
}

export function normalizeVolume(volume = {}, index = 0) {
  const order = Number.isFinite(volume.order) ? volume.order : index + 1;
  return {
    id: String(volume.id || `volume-${order}`),
    title: String(volume.title || `第 ${order} 卷`),
    subtitle: String(volume.subtitle || ""),
    summary: String(volume.summary || ""),
    order,
    status: volume.status === "hidden" ? "hidden" : "visible",
    collapsed: Boolean(volume.collapsed),
  };
}

export function normalizeVolumes(volumes = []) {
  return (Array.isArray(volumes) ? volumes : [])
    .map(normalizeVolume)
    .sort((left, right) => left.order - right.order || left.title.localeCompare(right.title, "zh-CN"))
    .map((volume, index) => ({ ...volume, order: index + 1 }));
}

export function normalizeSection(section = {}, index = 0) {
  const order = Number.isFinite(section.order) ? section.order : index + 1;
  const title = String(section.title || `小节 ${order}`);
  return {
    id: String(section.id || `section-${order}`),
    title,
    order,
    body: String(section.body || ""),
    anchor: String(section.anchor || `section-${order}`),
  };
}

export function normalizeSections(sections = []) {
  return (Array.isArray(sections) ? sections : [])
    .map(normalizeSection)
    .sort((left, right) => left.order - right.order || left.title.localeCompare(right.title, "zh-CN"))
    .map((section, index) => ({
      ...section,
      order: index + 1,
      anchor: section.anchor || `section-${index + 1}`,
    }));
}

export function normalizeWorkStructure(work) {
  return {
    ...work,
    chapterStructure: normalizeChapterStructureConfig(work.chapterStructure),
    volumes: normalizeVolumes(work.volumes),
  };
}

export function normalizeChapterStructureFields(chapter) {
  return {
    ...chapter,
    volume: chapter.volume === undefined ? "" : String(chapter.volume || ""),
    sections: normalizeSections(chapter.sections),
  };
}

export function wordCount(source) {
  return String(source || "").replace(/[#>*_`[\]()!-]/g, "").replace(/\s+/g, "").length;
}

export function chapterWordCount(chapter) {
  return wordCount([chapter.body, ...normalizeSections(chapter.sections).map((section) => section.body)].join("\n\n"));
}

export function publicChapterBody(work, chapter) {
  const structure = normalizeChapterStructureConfig(work?.chapterStructure);
  const sections = normalizeSections(chapter.sections);
  if (!sections.length) return chapter.body || "";
  const sectionBodies = sections.map((section, index) => {
    if (!structure.enableSections) return section.body;
    return `<h2 id="${sectionAnchor(section, index)}">${section.title}</h2>\n\n${section.body}`;
  });
  return [chapter.body, ...sectionBodies].filter((part) => String(part || "").trim()).join("\n\n");
}

export function structurePreview(work) {
  const structure = normalizeChapterStructureConfig(work?.chapterStructure);
  return [
    structure.enableVolumes ? structure.volumeLabel : "",
    structure.chapterLabel,
    structure.enableSections ? structure.sectionLabel : "",
  ].filter(Boolean);
}

export function groupChaptersByVolume(work, chapters, options = {}) {
  const structure = normalizeChapterStructureConfig(work?.chapterStructure);
  const orderedChapters = [...(chapters || [])].sort((left, right) => left.order - right.order);
  if (!structure.enableVolumes) {
    return [{ id: unassignedVolumeId, volume: null, chapters: orderedChapters }];
  }
  const volumes = normalizeVolumes(work?.volumes);
  const visibleVolumes = options.includeHiddenVolumes
    ? volumes
    : volumes.filter((volume) => volume.status !== "hidden");
  const visibleIds = new Set(visibleVolumes.map((volume) => volume.id));
  const groups = visibleVolumes.map((volume) => ({
    id: volume.id,
    volume,
    chapters: orderedChapters.filter((chapter) => chapter.volume === volume.id),
  }));
  const unassigned = orderedChapters.filter((chapter) => !chapter.volume || !visibleIds.has(chapter.volume));
  if (unassigned.length) groups.push({ id: unassignedVolumeId, volume: null, chapters: unassigned });
  return groups;
}

export function chapterHref(workSlug, chapterSlug, anchor = "") {
  return `#/works/${workSlug}/chapters/${chapterSlug}${anchor ? `#${anchor}` : ""}`;
}
