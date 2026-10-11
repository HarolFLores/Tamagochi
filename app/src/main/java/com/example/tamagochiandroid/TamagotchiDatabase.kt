package com.example.tamagochiandroid

import android.content.Context
import androidx.room.*
import kotlinx.coroutines.flow.Flow

// 1. La tabla con los datos de tu mascota
@Entity(tableName = "mascota_estado")
data class MascotaEstado(
    @PrimaryKey val id: Int = 1,
    val energia: Float = 0.8f,
    val hambre: Float = 0.6f
)

// 2. Los comandos para leer y escribir
@Dao
interface MascotaDao {
    @Query("SELECT * FROM mascota_estado WHERE id = 1")
    fun obtenerEstado(): Flow<MascotaEstado?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun guardarEstado(estado: MascotaEstado)
}

// 3. La creación de la base de datos
@Database(entities = [MascotaEstado::class], version = 1, exportSchema = false)
abstract class MascotaDatabase : RoomDatabase() {
    abstract fun mascotaDao(): MascotaDao

    companion object {
        @Volatile
        private var INSTANCE: MascotaDatabase? = null

        fun getDatabase(context: Context): MascotaDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    MascotaDatabase::class.java,
                    "mascota_database"
                ).build()
                INSTANCE = instance
                instance
            }
        }
    }
}