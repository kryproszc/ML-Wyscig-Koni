# 👉 ZMIEŃ tę ścieżkę na swoją
base_dir <- "C:/sciezka/do/standaryzacja v3"

# 👉 ZMIEŃ jeśli plik inaczej się nazywa
csv_name <- "X.csv"

target_city <- "MIELEC"
target_street_fragment <- "ALEJA NIEPODLEGŁOŚCI"

# czy zapisać wynik do pliku CSV?
save_results <- TRUE
output_file <- file.path(base_dir, "wyniki_mielec_aleja_niepodleglosci.csv")

wyniki_list <- list()

for (i in 1:6) {
  subfolder <- paste0("cz", i)
  folder_path <- file.path(base_dir, subfolder)
  csv_path <- file.path(folder_path, csv_name)
  
  if (!file.exists(csv_path)) {
    message("[INFO] Brak pliku: ", csv_path)
    next
  }
  
  message("[INFO] Przetwarzam: ", csv_path)
  
  # typowe polskie CSV: separator ; i UTF-8 (często z BOM)
  df <- tryCatch(
    {
      read.csv(csv_path,
               sep = ";",
               header = TRUE,
               fileEncoding = "UTF-8",
               check.names = FALSE,
               stringsAsFactors = FALSE)
    },
    error = function(e) {
      message("[BŁĄD] Nie można odczytać pliku: ", csv_path)
      message(e)
      return(NULL)
    }
  )
  
  if (is.null(df)) next
  
  # zabezpieczenie, jeśli kolumny mogą nie istnieć
  miasto_col <- "Adres ubezpieczonego obiektu - Miasto"
  ulica_col  <- "Adres ubezpieczonego obiektu - Ulica i numer"
  
  if (!all(c(miasto_col, ulica_col) %in% colnames(df))) {
    message("[UWAGA] Brak wymaganych kolumn w pliku: ", csv_path)
    next
  }
  
  # filtrowanie: miasto == MIELEC (case-insensitive, po trim)
  miasto_vec <- trimws(df[[miasto_col]])
  match_miasto <- toupper(miasto_vec) == toupper(target_city)
  
  # ulica zawiera fragment ALEJA NIEPODLEGŁOŚCI (case-insensitive)
  ulica_vec <- df[[ulica_col]]
  match_ulica <- grepl(target_street_fragment,
                       ulica_vec,
                       ignore.case = TRUE,
                       fixed = TRUE)
  
  df_match <- df[match_miasto & match_ulica, , drop = FALSE]
  
  if (nrow(df_match) > 0) {
    # dodaj info o źródle
    df_match[["_Źródło_folder"]] <- subfolder
    df_match[["_Źródło_plik"]]   <- csv_name
    
    wyniki_list[[length(wyniki_list) + 1]] <- df_match
  }
}

if (length(wyniki_list) > 0) {
  wyniki <- do.call(rbind, wyniki_list)
  message("\n[OK] Liczba znalezionych wierszy: ", nrow(wyniki))
} else {
  wyniki <- data.frame()
  message("\n[INFO] Nie znaleziono żadnych pasujących wierszy.")
}

# podgląd w konsoli
print(wyniki)

# zapis do CSV (opcjonalnie)
if (save_results && nrow(wyniki) > 0) {
  write.csv(wyniki,
            file = output_file,
            row.names = FALSE,
            fileEncoding = "UTF-8")
  message("[OK] Zapisano wynik do pliku: ", output_file)
}
