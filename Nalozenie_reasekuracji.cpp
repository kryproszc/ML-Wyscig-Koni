znajdz_koncentracje_pozarow <- function(df, R = 300, nazwa_kolumny = "value",
                                        prog_suma = 1000) {

  start_time <- Sys.time()
  cat("Przygotowuję dane...\n")

  # sf + transformacja
  sf_punkty <- st_as_sf(df, coords = c("lon", "lat"), crs = 4326)
  sf_punkty_m <- st_transform(sf_punkty, 2180)
  wsp_xy <- st_coordinates(sf_punkty_m)

  cat(" --> Dane zostały przekształcone do układu EPSG:2180.\n")
  cat("Grupuję dane w okręgach (drzewo KD-Tree)...\n")

  sasiedzi <- frNN(wsp_xy, eps = R, sort = FALSE, search = "kdtree")

  cat(" --> Sąsiedzi zostali znalezieni.\n")
  cat("Wyznaczam koncentracje...\n")

  n <- nrow(df)
  sumy <- numeric(n)
  lista_sasiadow <- vector("list", n)

  for (i in seq_len(n)) {
    indeksy <- sasiedzi$id[[i]]
    indeksy <- unique(indeksy)
    lista_sasiadow[[i]] <- indeksy

    # ważne: numeric conversion
    sumy[i] <- sum(as.numeric(df[[nazwa_kolumny]][indeksy]), na.rm = TRUE)
  }

  sasiedzi_str <- sapply(seq_len(n), function(i) {
    paste0(sort(lista_sasiadow[[i]]), collapse = ",")
  })

  sasiedzi_df <- data.frame(
    indeks = seq_len(n),
    suma = sumy,
    sasiedzi_str = sasiedzi_str,
    stringsAsFactors = FALSE
  )

  # unikalne grupy
  sasiedzi_df <- sasiedzi_df[order(sasiedzi_df$suma, decreasing = TRUE), ]
  sasiedzi_df_unikalne <- dplyr::distinct(sasiedzi_df, sasiedzi_str, .keep_all = TRUE)

  # ⭐ FILTR: tylko sumy większe niż próg
  wybrane_grupy <- sasiedzi_df_unikalne[sasiedzi_df_unikalne$suma > prog_suma, ]

  if (nrow(wybrane_grupy) == 0) {
    cat("\nBrak okręgów o sumie większej niż", prog_suma, "\n")
    return(list())
  }

  cat(" --> Wybrano", nrow(wybrane_grupy), "okręgów powyżej progu.\n")

  lista_okregow <- vector("list", nrow(wybrane_grupy))

  for (k in seq_len(nrow(wybrane_grupy))) {
    i <- wybrane_grupy$indeks[k]
    indeksy_i <- lista_sasiadow[[i]]

    srodek_xy <- wsp_xy[i, ]
    odleglosci <- sapply(indeksy_i, function(j) {
      sqrt((wsp_xy[j,1] - srodek_xy[1])^2 + (wsp_xy[j,2] - srodek_xy[2])^2)
    })

    df_grupa <- df[indeksy_i, , drop = FALSE]
    df_grupa$ranking <- k
    df_grupa$suma_grupy <- wybrane_grupy$suma[k]
    df_grupa$odleglosc <- odleglosci

    lista_okregow[[k]] <- df_grupa
  }

  cat("\n### Proces przebiegł pomyślnie! ###\n")
  end_time <- Sys.time()
  total_time <- round(difftime(end_time, start_time, units = "secs"), 2)
  cat("\nCałkowity czas wykonania:", total_time, "sekund.\n")

  return(lista_okregow)
}


wynik <- znajdz_koncentracje_pozarow(
  df,
  R = 300,
  nazwa_kolumny = "value",
  prog_suma = 5000     # <-- tylko grupy powyżej tej sumy
)




