import dayjs from "dayjs";

export const formatDateTime = (dateString: string) => {
  const parsed = dayjs(dateString);

  if (!parsed.isValid()) {
    return "";
  }

  return parsed.format("YYYY년 M월 D일 HH시 mm분");
};
