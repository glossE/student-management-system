const PREFIX = "PU";

// Pulls the next value from the dedicated Postgres sequence. Because nextval()
// is atomic, concurrent create requests each receive a unique number without
// any application-level locking — the classic race condition simply cannot occur.
export async function nextAdmissionNumber(tx) {
  const rows = await tx.$queryRaw`SELECT nextval('student_admission_seq') AS seq`;
  const seq = Number(rows[0].seq);
  const year = new Date().getFullYear();
  return `${PREFIX}-${year}-${String(seq).padStart(4, "0")}`;
}
